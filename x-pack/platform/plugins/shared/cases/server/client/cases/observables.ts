/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { MAX_OBSERVABLES_PER_CASE } from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import { UserActionTypes, CaseSchema } from '../../../common/types/domain';
import {
  type AddObservableRequest,
  type UpdateObservableRequest,
  type BulkAddObservablesRequest,
  type BulkDeleteObservablesRequest,
  type BulkGetObservablesRequest,
  type ObservablePost,
} from '../../../common/types/api';
import {
  AddObservableRequestSchema,
  UpdateObservableRequestSchema,
  BulkAddObservablesRequestSchema,
  BulkDeleteObservablesRequestSchema,
  BulkGetObservablesRequestSchema,
} from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import type { Authorization } from '../../authorization';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { flattenCaseSavedObject, mergeObservablesPreview } from '../../common/utils';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import type { ObservableKey } from '../../services/observables';
import { toObservable } from '../../services/observables/utils';
import {
  validateChangedObservableLengths,
  validateDuplicatedObservablesInRequest,
  validateObservableTypeKeyExists,
  validateObservableValue,
} from '../validators';
import { processObservables } from './utils';
import { emitObservablesAddedEvent } from './trigger_utils';

const ensureUpdateAuthorized = async (
  authorization: PublicMethodsOf<Authorization>,
  theCase: CaseSavedObjectTransformed
) => {
  return authorization.ensureAuthorized({
    operation: Operations.updateCase,
    entities: [
      {
        id: theCase.id,
        owner: theCase.attributes.owner,
      },
    ],
  });
};

const MAX_OBSERVABLES_WRITE_ATTEMPTS = 3;

const DUPLICATED_OBSERVABLES_MESSAGE = 'Invalid duplicated observables in request.';

const toObservableKey = ({ typeKey, value }: ObservableKey): string => `${typeKey}-${value}`;

interface ObservablesWrite<TResult> {
  /** The case field's observables after the write; left out when the write does not change the field. */
  observables?: Observable[];
  result: TResult;
}

interface ObservablesWriteArgs<TResult, TComputed extends ObservablesWrite<TResult> | undefined> {
  caseId: string;
  prefetchedCase?: CaseSavedObjectTransformed;
  caseService: CasesClientArgs['services']['caseService'];
  observableService: CasesClientArgs['services']['observableService'];
  /** Receives the case and how many `cases-observables` objects it holds, both read in the same attempt. */
  compute: (
    retrievedCase: CaseSavedObjectTransformed,
    typeCount: number
  ) => TComputed | Promise<TComputed>;
}

interface ObservablesWriteOutcome<TResult> {
  retrievedCase: CaseSavedObjectTransformed;
  patchedCase: Awaited<ReturnType<CasesClientArgs['services']['caseService']['patchCase']>>;
  result: TResult;
}

/**
 * Reads the case and counts its `cases-observables` objects, lets `compute` derive the new
 * observables list from them, and writes the list with the case version. The stored total counts
 * both stores. On a version conflict the case is re-read, the objects counted again and `compute`
 * runs again, so a concurrent writer's observables are never overwritten. `compute` returns
 * undefined when there is nothing to write, and leaves out the list to write only the total.
 *
 * Authorization runs once, against the first read. A saved object import can overwrite the case
 * with a different owner, so a re-read whose owner changed fails with a conflict rather than being
 * written under the first read's authorization.
 */
function writeObservablesWithRetry<TResult>(
  args: ObservablesWriteArgs<TResult, ObservablesWrite<TResult>>
): Promise<ObservablesWriteOutcome<TResult>>;
function writeObservablesWithRetry<TResult>(
  args: ObservablesWriteArgs<TResult, ObservablesWrite<TResult> | undefined>
): Promise<ObservablesWriteOutcome<TResult> | undefined>;
async function writeObservablesWithRetry<TResult>({
  caseId,
  prefetchedCase,
  caseService,
  observableService,
  compute,
}: ObservablesWriteArgs<TResult, ObservablesWrite<TResult> | undefined>): Promise<
  ObservablesWriteOutcome<TResult> | undefined
> {
  let ownerAtFirstRead: string | undefined;

  for (let attempt = 1; attempt <= MAX_OBSERVABLES_WRITE_ATTEMPTS; attempt++) {
    const [retrievedCase, typeCount] = await Promise.all([
      attempt === 1 && prefetchedCase ? prefetchedCase : caseService.getCase({ id: caseId }),
      observableService.getter.countForCase(caseId),
    ]);

    ownerAtFirstRead ??= retrievedCase.attributes.owner;
    if (retrievedCase.attributes.owner !== ownerAtFirstRead) {
      throw Boom.conflict(
        `The owner of case ${caseId} changed while its observables were being saved. Retry the request.`
      );
    }

    const write = await compute(retrievedCase, typeCount);
    if (!write) {
      return;
    }

    const fieldObservables = write.observables ?? retrievedCase.attributes.observables ?? [];

    try {
      const patchedCase = await caseService.patchCase({
        caseId: retrievedCase.id,
        originalCase: retrievedCase,
        version: retrievedCase.version,
        updatedAttributes: {
          ...(write.observables !== undefined && { observables: write.observables }),
          total_observables: fieldObservables.length + typeCount,
        },
      });

      return { retrievedCase, patchedCase, result: write.result };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) {
        throw error;
      }
    }
  }

  throw Boom.conflict(
    `The observables of case ${caseId} were modified concurrently ${MAX_OBSERVABLES_WRITE_ATTEMPTS} times in a row. Retry the request.`
  );
}

/**
 * Wraps an observable write failure in a 400, keeping a version conflict's 409 so the caller knows to retry.
 */
const toObservableWriteError = (message: string, error: unknown): Boom.Boom =>
  Boom.isBoom(error, 409) ? error : Boom.badRequest(`${message}: ${error}`);

/** Sets the stored total after a write to `cases-observables` objects, which leaves the case field as it is. */
const setObservablesTotal = (
  retrievedCase: CaseSavedObjectTransformed,
  { services: { caseService, observableService } }: CasesClientArgs
): Promise<ObservablesWriteOutcome<undefined>> =>
  writeObservablesWithRetry({
    caseId: retrievedCase.id,
    prefetchedCase: retrievedCase,
    caseService,
    observableService,
    compute: () => ({ result: undefined }),
  });

type ApplyObservablesResult =
  | {
      status: 'added';
      caseWithPatch: CaseSavedObjectTransformed;
      newlyAddedObservables: Observable[];
    }
  | { status: 'skipped'; reason: 'nothing_new' | 'limit_reached' };

/**
 * License-agnostic core that dedupes, caps, persists, and records a user action
 * for a set of observables on a case. Callers MUST enforce the Platinum license
 * gate and call notifyUsage themselves.
 *
 * New observables go to the case field. Values the case already holds in either
 * store are skipped, and the cap counts both stores.
 *
 * Skips both the patchCase write and the user action write when no new
 * observables were added (idempotency — avoids a no-op SO write on every
 * re-extraction of the same alert), and reports whether that was because
 * every observable was already stored or because the case is full.
 *
 * @param prefetchedCase - Optional already-fetched SO to avoid an extra getCase
 *   round-trip. When provided, `caseId` is ignored for the initial fetch.
 */
export const applyObservablesToCase = async (
  caseId: string,
  observables: ObservablePost[],
  clientArgs: CasesClientArgs,
  prefetchedCase?: CaseSavedObjectTransformed
): Promise<ApplyObservablesResult> => {
  const {
    services: { caseService, userActionService, observableService },
    user,
  } = clientArgs;

  if (observables.length === 0) {
    return { status: 'skipped', reason: 'nothing_new' };
  }

  // Set by the last `compute` run, which is the one that decided there was nothing to write.
  let skipReason: 'nothing_new' | 'limit_reached' = 'nothing_new';

  const written = await writeObservablesWithRetry({
    caseId,
    prefetchedCase,
    caseService,
    observableService,
    compute: async (retrievedCase, typeCount) => {
      const currentObservables = retrievedCase.attributes.observables ?? [];
      // Build a key-set from existing observables so we never overwrite or collapse
      // them — even when two stored rows share the same typeKey+value (reachable
      // via SO import or data written before the dedupe path was added).
      const existingKeys = new Set(currentObservables.map(toObservableKey));

      // Dedupe incoming entries against existing ones and against each other.
      // processObservables mints ids/timestamps for ObservablePost entries and
      // skips repeats, so it is safe to call for every incoming entry.
      const incomingMap = new Map<string, Observable>();
      observables.forEach((observable) => {
        if (existingKeys.has(toObservableKey(observable))) {
          return;
        }
        processObservables(incomingMap, observable);
      });

      // The type is searched only when it holds objects, which it doesn't until a later release
      // writes to it.
      const notInField = Array.from(incomingMap.values());
      const heldInType =
        typeCount > 0
          ? await observableService.getter.findExisting(retrievedCase.id, notInField)
          : [];
      const heldInTypeKeys = new Set(heldInType.map(toObservableKey));
      const newObservables = notInField.filter(
        (observable) => !heldInTypeKeys.has(toObservableKey(observable))
      );

      // Respect the per-case cap, which counts both stores: add as many new observables as fit.
      const remainingCapacity = Math.max(
        0,
        MAX_OBSERVABLES_PER_CASE - currentObservables.length - typeCount
      );
      const newlyAddedObservables = newObservables.slice(0, remainingCapacity);

      // Nothing new was added — skip both the patch write and the user action to
      // avoid a no-op SO write on every idempotent re-extraction (e.g. the same
      // alert being attached multiple times).
      if (newlyAddedObservables.length === 0) {
        skipReason = newObservables.length > 0 ? 'limit_reached' : 'nothing_new';
        return;
      }

      return {
        observables: [...currentObservables, ...newlyAddedObservables],
        result: newlyAddedObservables,
      };
    },
  });

  if (!written) {
    return { status: 'skipped', reason: skipReason };
  }

  const { retrievedCase, patchedCase, result: newlyAddedObservables } = written;

  await userActionService.creator.createUserAction({
    userAction: {
      type: UserActionTypes.observables,
      caseId: retrievedCase.id,
      owner: retrievedCase.attributes.owner,
      user,
      payload: {
        observables: { count: newlyAddedObservables.length, actionType: 'add' },
      },
    },
  });

  // Return the merged case and the new observables so the caller can emit the
  // trigger after a successful decode — never emit from inside this function
  // because bulk callers decode *after* calling applyObservablesToCase.
  return {
    status: 'added',
    caseWithPatch: {
      ...retrievedCase,
      ...patchedCase,
      attributes: { ...retrievedCase.attributes, ...patchedCase?.attributes },
      references: retrievedCase.references,
    },
    newlyAddedObservables,
  };
};

export const addObservable = async (
  caseId: string,
  params: AddObservableRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService, licensingService, observableService },
    authorization,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to assign observables to cases, you must be subscribed to an Elastic Platinum license'
    );
  }

  licensingService.notifyUsage(LICENSING_CASE_OBSERVABLES_FEATURE);

  // Extract into an inner function so the emit can run outside the error-wrapping
  // boundary. A throw from the event bus must not turn a fully-committed write into
  // a 400 — and a decode failure (CaseSchema) must not silently skip the emit for a
  // write that the API reports as failed. Both invariants require the emit to sit
  // after the try/catch, which `.catch` makes possible without `let` variables.
  const {
    result: decodedCase,
    caseForEmit,
    observablesForEmit,
  } = await (async () => {
    const paramArgs = decodeWithExcessOrThrowZod(AddObservableRequestSchema)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    await validateObservableTypeKeyExists(casesClient, {
      caseOwner: retrievedCase.attributes.owner,
      observableTypeKey: params.observable.typeKey,
    });

    validateObservableValue(paramArgs.observable.typeKey, paramArgs.observable.value);

    const applied = await applyObservablesToCase(
      caseId,
      [paramArgs.observable],
      clientArgs,
      retrievedCase
    );
    if (applied.status === 'skipped') {
      throw applied.reason === 'limit_reached'
        ? Boom.forbidden(`Max ${MAX_OBSERVABLES_PER_CASE} observables per case is allowed.`)
        : Boom.badRequest(DUPLICATED_OBSERVABLES_MESSAGE);
    }

    const flattenedCase = flattenCaseSavedObject({ savedObject: applied.caseWithPatch });
    const observablesPreviews = await observableService.getter.getPreviews([flattenedCase], {
      ignoreErrors: true,
    });
    const res = mergeObservablesPreview(flattenedCase, observablesPreviews.get(flattenedCase.id));

    // Decode before emitting — if the SO fails CaseSchema validation, we must not fire
    // the trigger for a request the API will report as failed. Matches the precedent
    // in create.ts where decodeOrThrow runs before the emit.
    const result = decodeOrThrowZod(CaseSchema)(res);
    return {
      result,
      caseForEmit: applied.caseWithPatch,
      observablesForEmit: applied.newlyAddedObservables,
    };
  })().catch((error) => {
    throw toObservableWriteError('Failed to add observable', error);
  });

  emitObservablesAddedEvent(clientArgs, caseForEmit, observablesForEmit);
  return decodedCase;
};

const isUnchangedObservable = (stored: Observable, original: Observable | undefined): boolean =>
  stored.value === original?.value &&
  stored.description === original?.description &&
  stored.updatedAt === original?.updatedAt;

const MODIFIED_BY_ANOTHER_REQUEST_MESSAGE = (observableId: string) =>
  `Observable id ${observableId} was modified by another request. Reload the case and try again.`;

interface UpdateObservableInStoreArgs {
  observableId: string;
  patch: UpdateObservableRequest['observable'];
  retrievedCase: CaseSavedObjectTransformed;
  clientArgs: CasesClientArgs;
}

const updateObservableInField = ({
  observableId,
  patch,
  retrievedCase,
  originalObservable,
  clientArgs: {
    services: { caseService, observableService },
  },
}: UpdateObservableInStoreArgs & {
  originalObservable: Observable;
}): Promise<ObservablesWriteOutcome<undefined>> =>
  writeObservablesWithRetry({
    caseId: retrievedCase.id,
    prefetchedCase: retrievedCase,
    caseService,
    observableService,
    compute: async (currentCase, typeCount) => {
      const currentObservables = currentCase.attributes.observables ?? [];

      const observableIndex = currentObservables.findIndex(
        (observable) => observable.id === observableId
      );

      if (observableIndex === -1) {
        throw Boom.notFound(`Failed to update observable: observable id ${observableId} not found`);
      }

      const currentObservable = currentObservables[observableIndex];

      if (!isUnchangedObservable(currentObservable, originalObservable)) {
        throw Boom.conflict(MODIFIED_BY_ANOTHER_REQUEST_MESSAGE(observableId));
      }

      validateChangedObservableLengths(currentObservable, patch);
      validateObservableValue(currentObservable.typeKey, patch.value);

      const updatedObservables = [...currentObservables];
      updatedObservables[observableIndex] = {
        ...currentObservable,
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      validateDuplicatedObservablesInRequest({
        requestFields: updatedObservables,
      });

      if (patch.value !== currentObservable.value && typeCount > 0) {
        const heldInType = await observableService.getter.findExisting(currentCase.id, [
          { typeKey: currentObservable.typeKey, value: patch.value },
        ]);

        if (heldInType.length > 0) {
          throw Boom.badRequest(DUPLICATED_OBSERVABLES_MESSAGE);
        }
      }

      return { observables: updatedObservables, result: undefined };
    },
  });

/** Edits a `cases-observables` object in place with its version, then sets the case's stored total. */
const updateObservableInType = async ({
  observableId,
  patch,
  retrievedCase,
  clientArgs,
}: UpdateObservableInStoreArgs): Promise<ObservablesWriteOutcome<undefined>> => {
  const {
    services: { observableService },
    user,
  } = clientArgs;

  const {
    found: [storedObservable],
  } = await observableService.getter.getForCase(retrievedCase.id, [observableId]);

  if (storedObservable === undefined) {
    throw Boom.notFound(`Failed to update observable: observable id ${observableId} not found`);
  }

  const { type_key: typeKey, value } = storedObservable.attributes;

  validateChangedObservableLengths(storedObservable.attributes, patch);
  validateObservableValue(typeKey, patch.value);

  if (patch.value !== value) {
    const heldInField = (retrievedCase.attributes.observables ?? []).some(
      (observable) => observable.typeKey === typeKey && observable.value === patch.value
    );
    const heldInType = await observableService.getter.findExisting(retrievedCase.id, [
      { typeKey, value: patch.value },
    ]);

    if (heldInField || heldInType.some(({ id }) => id !== observableId)) {
      throw Boom.badRequest(DUPLICATED_OBSERVABLES_MESSAGE);
    }
  }

  try {
    await observableService.update({
      observable: storedObservable,
      attributes: {
        value: patch.value,
        description: patch.description,
        updated_at: new Date().toISOString(),
        updated_by: user,
      },
    });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isConflictError(error as Error)) {
      throw Boom.conflict(MODIFIED_BY_ANOTHER_REQUEST_MESSAGE(observableId));
    }
    throw error;
  }

  return setObservablesTotal(retrievedCase, clientArgs);
};

export const updateObservable = async (
  caseId: string,
  observableId: string,
  params: UpdateObservableRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService, licensingService, userActionService, observableService },
    authorization,
    user,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to update observables in cases, you must be subscribed to an Elastic Platinum license'
    );
  }

  licensingService.notifyUsage(LICENSING_CASE_OBSERVABLES_FEATURE);

  try {
    const paramArgs = decodeWithExcessOrThrowZod(UpdateObservableRequestSchema)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    const originalObservable = retrievedCase.attributes.observables?.find(
      ({ id }) => id === observableId
    );
    const storeArgs = { observableId, patch: paramArgs.observable, retrievedCase, clientArgs };

    // An edited observable stays in the store that holds it.
    const { retrievedCase: latestCase, patchedCase: updatedCase } =
      originalObservable !== undefined
        ? await updateObservableInField({ ...storeArgs, originalObservable })
        : await updateObservableInType(storeArgs);

    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.observables,
        caseId: latestCase.id,
        owner: latestCase.attributes.owner,
        user,
        payload: {
          observables: { count: 1, actionType: 'update' },
        },
      },
    });

    const flattenedCase = flattenCaseSavedObject({
      savedObject: {
        ...latestCase,
        ...updatedCase,
        attributes: { ...latestCase.attributes, ...updatedCase?.attributes },
        references: latestCase.references,
      },
    });
    const observablesPreviews = await observableService.getter.getPreviews([flattenedCase], {
      ignoreErrors: true,
    });
    const res = mergeObservablesPreview(flattenedCase, observablesPreviews.get(flattenedCase.id));

    return decodeOrThrowZod(CaseSchema)(res);
  } catch (error) {
    throw toObservableWriteError('Failed to update observable', error);
  }
};

const deleteObservableInField = (
  observableId: string,
  retrievedCase: CaseSavedObjectTransformed,
  { services: { caseService, observableService } }: CasesClientArgs
): Promise<ObservablesWriteOutcome<undefined>> =>
  writeObservablesWithRetry({
    caseId: retrievedCase.id,
    prefetchedCase: retrievedCase,
    caseService,
    observableService,
    compute: (currentCase) => {
      const updatedObservables = currentCase.attributes.observables.filter(
        (observable) => observable.id !== observableId
      );

      // NOTE: same length of observables pre and post filter means that the observable id has not been found
      if (updatedObservables.length === currentCase.attributes.observables.length) {
        throw Boom.notFound(`Failed to delete observable: observable id ${observableId} not found`);
      }

      return { observables: updatedObservables, result: undefined };
    },
  });

/** Deletes a `cases-observables` object, then sets the case's stored total. */
const deleteObservableInType = async (
  observableId: string,
  retrievedCase: CaseSavedObjectTransformed,
  clientArgs: CasesClientArgs
): Promise<ObservablesWriteOutcome<undefined>> => {
  const { observableService } = clientArgs.services;
  const { found } = await observableService.getter.getForCase(retrievedCase.id, [observableId]);

  if (found.length === 0) {
    throw Boom.notFound(`Failed to delete observable: observable id ${observableId} not found`);
  }

  await observableService.bulkDelete(found);
  return setObservablesTotal(retrievedCase, clientArgs);
};

export const deleteObservable = async (
  caseId: string,
  observableId: string,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService, licensingService, userActionService },
    authorization,
    user,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to delete observables from cases, you must be subscribed to an Elastic Platinum license'
    );
  }

  licensingService.notifyUsage(LICENSING_CASE_OBSERVABLES_FEATURE);

  try {
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    const isInField = (retrievedCase.attributes.observables ?? []).some(
      ({ id }) => id === observableId
    );
    const { retrievedCase: latestCase } = isInField
      ? await deleteObservableInField(observableId, retrievedCase, clientArgs)
      : await deleteObservableInType(observableId, retrievedCase, clientArgs);

    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.observables,
        caseId: latestCase.id,
        owner: latestCase.attributes.owner,
        user,
        payload: {
          observables: { count: 1, actionType: 'delete' },
        },
      },
    });
  } catch (error) {
    throw toObservableWriteError(`Failed to delete observable id: ${observableId}`, error);
  }
};

export const bulkAddObservables = async (
  params: BulkAddObservablesRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService, licensingService, observableService },
    authorization,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to assign observables to cases, you must be subscribed to an Elastic Platinum license'
    );
  }

  licensingService.notifyUsage(LICENSING_CASE_OBSERVABLES_FEATURE);

  // Same inner-function pattern as addObservable: emit must run outside the
  // error-wrapping boundary so bus errors cannot turn a committed write into a 400,
  // and the decode must precede the emit so a CaseSchema failure does not fire the
  // trigger for a request the API will report as failed.
  const {
    result: decodedCase,
    caseForEmit,
    observablesForEmit,
  } = await (async () => {
    const paramArgs = decodeWithExcessOrThrowZod(BulkAddObservablesRequestSchema)(params);
    const retrievedCase = await caseService.getCase({ id: paramArgs.caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    await Promise.all(
      params.observables.map((observable: ObservablePost) =>
        validateObservableTypeKeyExists(casesClient, {
          caseOwner: retrievedCase.attributes.owner,
          observableTypeKey: observable.typeKey,
        })
      )
    );

    const applied = await applyObservablesToCase(
      paramArgs.caseId,
      paramArgs.observables,
      clientArgs,
      retrievedCase
    );
    if (applied.status === 'skipped') {
      throw Boom.badRequest(`Failed to add observable`);
    }
    const flattenedCase = flattenCaseSavedObject({ savedObject: applied.caseWithPatch });
    const observablesPreviews = await observableService.getter.getPreviews([flattenedCase], {
      ignoreErrors: true,
    });
    const res = mergeObservablesPreview(flattenedCase, observablesPreviews.get(flattenedCase.id));
    const result = decodeOrThrowZod(CaseSchema)(res);
    return {
      result,
      caseForEmit: applied.caseWithPatch,
      observablesForEmit: applied.newlyAddedObservables,
    };
  })().catch((error) => {
    throw toObservableWriteError('Failed to add observable', error);
  });

  emitObservablesAddedEvent(clientArgs, caseForEmit, observablesForEmit);
  return decodedCase;
};

export const bulkDeleteObservables = async (
  params: BulkDeleteObservablesRequest,
  clientArgs: CasesClientArgs
) => {
  const {
    services: { caseService, licensingService, userActionService, observableService },
    authorization,
    user,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to delete observables from cases, you must be subscribed to an Elastic Platinum license'
    );
  }

  licensingService.notifyUsage(LICENSING_CASE_OBSERVABLES_FEATURE);

  const paramArgs = decodeWithExcessOrThrowZod(BulkDeleteObservablesRequestSchema)(params);
  const retrievedCase = await caseService.getCase({ id: paramArgs.caseId });
  await ensureUpdateAuthorized(authorization, retrievedCase);

  const idsToDelete = new Set(paramArgs.observableIds);
  const fieldIds = new Set(
    (retrievedCase.attributes.observables ?? [])
      .map(({ id }) => id)
      .filter((id) => idsToDelete.has(id))
  );

  // Every id must be found in one of the stores before anything is deleted.
  const { found: typeObservables, missingIds } = await observableService.getter.getForCase(
    retrievedCase.id,
    [...idsToDelete].filter((id) => !fieldIds.has(id))
  );

  if (missingIds.length > 0) {
    throw Boom.notFound(
      `Failed to bulk delete observables: observable ids not found: ${missingIds.join(', ')}`
    );
  }

  await observableService.bulkDelete(typeObservables);

  const {
    retrievedCase: latestCase,
    patchedCase: updatedCase,
    result: removedFromField,
  } = await writeObservablesWithRetry({
    caseId: paramArgs.caseId,
    prefetchedCase: retrievedCase,
    caseService,
    observableService,
    // The type objects are already deleted, so a field id that a concurrent request removed
    // before a retry counts as deleted rather than failing the request.
    compute: (currentCase) => {
      const currentObservables = currentCase.attributes.observables ?? [];
      const updatedObservables = currentObservables.filter(({ id }) => !fieldIds.has(id));
      const removed = currentObservables.length - updatedObservables.length;

      return { ...(removed > 0 && { observables: updatedObservables }), result: removed };
    },
  });

  const deletedCount = removedFromField + typeObservables.length;
  if (deletedCount > 0) {
    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.observables,
        caseId: latestCase.id,
        owner: latestCase.attributes.owner,
        user,
        payload: {
          observables: { count: deletedCount, actionType: 'delete' },
        },
      },
    });
  }

  const flattenedCase = flattenCaseSavedObject({
    savedObject: {
      ...latestCase,
      ...updatedCase,
      attributes: { ...latestCase.attributes, ...updatedCase?.attributes },
      references: latestCase.references,
    },
  });
  const observablesPreviews = await observableService.getter.getPreviews([flattenedCase], {
    ignoreErrors: true,
  });
  const res = mergeObservablesPreview(flattenedCase, observablesPreviews.get(flattenedCase.id));

  const result = decodeOrThrowZod(CaseSchema)(res);
  return result;
};

/**
 * Returns the case's observables with the given ids, from either store. A case response lists at
 * most 50, so this reaches the rest. Ids the case does not hold are left out.
 */
export const bulkGetObservables = async (
  params: BulkGetObservablesRequest,
  clientArgs: CasesClientArgs
): Promise<Observable[]> => {
  const {
    services: { caseService, observableService },
    authorization,
    logger,
  } = clientArgs;

  try {
    const { caseId, observableIds } = decodeWithExcessOrThrowZod(BulkGetObservablesRequestSchema)(
      params
    );
    const theCase = await caseService.getCase({ id: caseId });

    await authorization.ensureAuthorized({
      operation: Operations.findObservables,
      entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
    });

    const ids = new Set(observableIds);
    const inField = (theCase.attributes.observables ?? []).filter(({ id }) => ids.has(id));
    const inFieldIds = new Set(inField.map(({ id }) => id));
    const { found } = await observableService.getter.getForCase(
      theCase.id,
      [...ids].filter((id) => !inFieldIds.has(id))
    );

    return [...inField, ...found.map(toObservable)];
  } catch (error) {
    throw createCaseError({
      message: `Failed to get observables of case id: ${params.caseId}: ${error}`,
      error,
      logger,
    });
  }
};
