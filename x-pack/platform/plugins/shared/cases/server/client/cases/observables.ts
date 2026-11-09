/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import Boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import {
  MAX_BULK_CREATE_OBSERVABLES,
  MAX_STORED_OBSERVABLES_PER_CASE,
} from '../../../common/constants';
import type { Case, Observable } from '../../../common/types/domain';
import { UserActionTypes, CaseSchema } from '../../../common/types/domain';
import {
  type AddObservableRequest,
  type UpdateObservableRequest,
  type BulkAddObservablesRequest,
  type BulkCreateObservablesRequest,
  type BulkCreateObservablesResponse,
  type BulkDeleteObservablesRequest,
  type ObservablePost,
} from '../../../common/types/api';
import {
  AddObservableRequestSchema,
  UpdateObservableRequestSchema,
  BulkAddObservablesRequestSchema,
  BulkCreateObservablesRequestSchema,
  BulkDeleteObservablesRequestSchema,
} from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import type { Authorization } from '../../authorization';
import { Operations } from '../../authorization';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { flattenCaseSavedObject } from '../../common/utils';
import { withCaseObservablesPreview } from '../../common/observables_preview';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import { observableKey, toObservable } from '../../services/observables';
import type { ObservableToCreate } from '../../services/observables';
import {
  validateChangedObservableLengths,
  validateDuplicatedObservablesInRequest,
  validateObservableTypeKeyExists,
  validateObservableValue,
} from '../validators';
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

export { observableKey };

const MAX_OBSERVABLES_WRITE_ATTEMPTS = 3;

interface ObservablesWrite<TResult> {
  observables: Observable[];
  result: TResult;
}

interface ObservablesWriteArgs<TResult, TComputed extends ObservablesWrite<TResult> | undefined> {
  caseId: string;
  prefetchedCase?: CaseSavedObjectTransformed;
  clientArgs: CasesClientArgs;
  compute: (retrievedCase: CaseSavedObjectTransformed) => TComputed;
}

interface ObservablesWriteOutcome<TResult> {
  retrievedCase: CaseSavedObjectTransformed;
  caseWithPatch: CaseSavedObjectTransformed;
  result: TResult;
}

const mergePatchedCase = (
  retrievedCase: CaseSavedObjectTransformed,
  patchedCase: Awaited<ReturnType<CasesClientArgs['services']['caseService']['patchCase']>>
): CaseSavedObjectTransformed => ({
  ...retrievedCase,
  ...patchedCase,
  attributes: { ...retrievedCase.attributes, ...patchedCase?.attributes },
  references: retrievedCase.references,
});

/**
 * Reads the case, lets `compute` derive the new case-field observables from it, and writes them
 * with the case version. On a version conflict the case is re-read and `compute` runs again, so a
 * concurrent writer's observables are never overwritten. `compute` returns undefined when there
 * is nothing to write. The stored total counts the field and the `cases-observables` objects.
 *
 * The case is not re-authorized on a re-read: authorization ran on the first read and the owner
 * of a case cannot change.
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
  clientArgs,
  compute,
}: ObservablesWriteArgs<TResult, ObservablesWrite<TResult> | undefined>): Promise<
  ObservablesWriteOutcome<TResult> | undefined
> {
  const {
    services: { caseService, observableService },
    user,
  } = clientArgs;

  for (let attempt = 1; attempt <= MAX_OBSERVABLES_WRITE_ATTEMPTS; attempt++) {
    const retrievedCase =
      attempt === 1 && prefetchedCase ? prefetchedCase : await caseService.getCase({ id: caseId });

    const write = compute(retrievedCase);
    if (!write) {
      return;
    }

    const typeCount = await observableService.countForCase(retrievedCase.id);

    try {
      const patchedCase = await caseService.patchCase({
        caseId: retrievedCase.id,
        originalCase: retrievedCase,
        version: retrievedCase.version,
        updatedAttributes: {
          observables: write.observables,
          total_observables: write.observables.length + typeCount,
          updated_at: new Date().toISOString(),
          updated_by: user,
        },
      });

      return {
        retrievedCase,
        caseWithPatch: mergePatchedCase(retrievedCase, patchedCase),
        result: write.result,
      };
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
 * Sets the stored total (case field plus `cases-observables` objects), `updated_at` and
 * `updated_by` on the case after a write to the type. The count is taken after the write, so the
 * last writer stores a total that includes its own changes; the daily cleanup recounts.
 */
const patchObservablesTotal = async (
  theCase: CaseSavedObjectTransformed,
  clientArgs: CasesClientArgs
): Promise<{ caseWithPatch: CaseSavedObjectTransformed; totalObservables: number }> => {
  const {
    services: { caseService, observableService },
    user,
  } = clientArgs;

  const typeCount = await observableService.countForCase(theCase.id);
  const totalObservables = (theCase.attributes.observables ?? []).length + typeCount;

  const patchedCase = await caseService.patchCase({
    caseId: theCase.id,
    originalCase: theCase,
    updatedAttributes: {
      total_observables: totalObservables,
      updated_at: new Date().toISOString(),
      updated_by: user,
    },
  });

  return { caseWithPatch: mergePatchedCase(theCase, patchedCase), totalObservables };
};

const recordObservablesUserAction = async (
  theCase: CaseSavedObjectTransformed,
  count: number,
  actionType: 'add' | 'update' | 'delete',
  { services: { userActionService }, user }: CasesClientArgs
) =>
  userActionService.creator.createUserAction({
    userAction: {
      type: UserActionTypes.observables,
      caseId: theCase.id,
      owner: theCase.attributes.owner,
      user,
      payload: {
        observables: { count, actionType },
      },
    },
  });

const buildCaseResponse = async (
  theCase: CaseSavedObjectTransformed,
  { services: { observableService } }: CasesClientArgs
): Promise<Case> =>
  decodeOrThrowZod(CaseSchema)(
    await withCaseObservablesPreview(
      flattenCaseSavedObject({ savedObject: theCase }),
      observableService
    )
  );

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
};

export interface AppliedObservables {
  /** The case with its updated total; set only when observables were added. */
  caseWithPatch?: CaseSavedObjectTransformed;
  newlyAddedObservables: Observable[];
  skippedDuplicates: ObservablePost[];
  skippedOverCap: ObservablePost[];
  totalObservables: number;
}

/**
 * License-agnostic core of every add: auto-extraction, add, bulk add and the bulk create route.
 * Callers MUST enforce the Platinum license gate and call notifyUsage themselves.
 *
 * New observables are written only as `cases-observables` objects, in chunks of 1,000. Before each
 * chunk it skips repeats of the case field (in memory) and of the type (one lookup), and checks
 * the cap of 10,000 against the field count plus the type count. Concurrent writers can overshoot
 * the cap by their request sizes, and a value added twice at the same moment is removed by the
 * daily cleanup.
 *
 * Records one user action per request and sets the stored total, but only when something was
 * added, so re-extracting the same alert writes nothing.
 *
 * @param prefetchedCase - Optional already-fetched SO to avoid an extra getCase round-trip.
 */
export const applyObservablesToCase = async (
  caseId: string,
  observables: ObservablePost[],
  clientArgs: CasesClientArgs,
  prefetchedCase?: CaseSavedObjectTransformed
): Promise<AppliedObservables> => {
  const {
    services: { caseService, observableService },
    logger,
    user,
  } = clientArgs;

  const theCase = prefetchedCase ?? (await caseService.getCase({ id: caseId }));
  const fieldObservables = theCase.attributes.observables ?? [];

  const seenKeys = new Set(fieldObservables.map(observableKey));
  const skippedDuplicates: ObservablePost[] = [];
  const candidates: ObservablePost[] = [];

  for (const observable of observables) {
    const key = observableKey(observable);
    if (seenKeys.has(key)) {
      skippedDuplicates.push(observable);
    } else {
      seenKeys.add(key);
      candidates.push(observable);
    }
  }

  const newlyAddedObservables: Observable[] = [];
  const skippedOverCap: ObservablePost[] = [];
  let typeCount: number | undefined;
  let nextCreatedAt = Date.now();

  /** Adds the chunk's new observables that fit under the cap; the rest are recorded as skipped. */
  const addChunk = async (candidatesChunk: ObservablePost[]): Promise<Observable[]> => {
    const [existing, currentTypeCount] = await Promise.all([
      observableService.findExisting(theCase.id, candidatesChunk),
      observableService.countForCase(theCase.id),
    ]);
    typeCount = currentTypeCount;

    const existingKeys = new Set(existing.map(observableKey));
    const newObservables = candidatesChunk.filter((observable) => {
      if (existingKeys.has(observableKey(observable))) {
        skippedDuplicates.push(observable);
        return false;
      }
      return true;
    });

    const room = Math.max(
      0,
      MAX_STORED_OBSERVABLES_PER_CASE - fieldObservables.length - currentTypeCount
    );
    const fitting = newObservables.slice(0, room);
    skippedOverCap.push(...newObservables.slice(room));

    if (fitting.length === 0) {
      return [];
    }

    // One millisecond apart, so the oldest-first preview and paging keep the request's order.
    nextCreatedAt = Math.max(nextCreatedAt, Date.now());
    const toCreate: ObservableToCreate[] = fitting.map(({ typeKey, value, description }, i) => ({
      id: uuidv4(),
      typeKey,
      value,
      description: description ?? null,
      createdAt: new Date(nextCreatedAt + i).toISOString(),
    }));
    nextCreatedAt += fitting.length;

    return observableService.bulkCreate({
      caseId: theCase.id,
      owner: theCase.attributes.owner,
      observables: toCreate,
      user,
    });
  };

  for (const candidatesChunk of chunk(candidates, MAX_BULK_CREATE_OBSERVABLES)) {
    // Once one chunk reached the cap, the rest cannot fit either.
    if (skippedOverCap.length > 0) {
      skippedOverCap.push(...candidatesChunk);
    } else {
      newlyAddedObservables.push(...(await addChunk(candidatesChunk)));
    }
  }
  if (skippedOverCap.length > 0) {
    logger.warn(
      `Skipped ${skippedOverCap.length} observable(s) for case ${theCase.id}: the case holds the maximum of ${MAX_STORED_OBSERVABLES_PER_CASE} observables`
    );
  }

  if (newlyAddedObservables.length === 0) {
    return {
      newlyAddedObservables,
      skippedDuplicates,
      skippedOverCap,
      totalObservables:
        fieldObservables.length + (typeCount ?? (await observableService.countForCase(caseId))),
    };
  }

  const { caseWithPatch, totalObservables } = await patchObservablesTotal(theCase, clientArgs);
  await recordObservablesUserAction(theCase, newlyAddedObservables.length, 'add', clientArgs);

  return {
    caseWithPatch,
    newlyAddedObservables,
    skippedDuplicates,
    skippedOverCap,
    totalObservables,
  };
};

const ensurePlatinum = async (
  { services: { licensingService } }: CasesClientArgs,
  message: string
) => {
  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(message);
  }

  licensingService.notifyUsage(LICENSING_CASE_OBSERVABLES_FEATURE);
};

const ADD_LICENSE_MESSAGE =
  'In order to assign observables to cases, you must be subscribed to an Elastic Platinum license';
const UPDATE_LICENSE_MESSAGE =
  'In order to update observables in cases, you must be subscribed to an Elastic Platinum license';
const DELETE_LICENSE_MESSAGE =
  'In order to delete observables from cases, you must be subscribed to an Elastic Platinum license';

/**
 * Throws 400 when a value edit would repeat a type key and value held by another observable of
 * the case, in either store.
 */
const ensureNoRepeatAcrossStores = async ({
  caseId,
  observableId,
  typeKey,
  value,
  fieldObservables,
  clientArgs,
}: {
  caseId: string;
  observableId: string;
  typeKey: string;
  value: string;
  fieldObservables: Observable[];
  clientArgs: CasesClientArgs;
}) => {
  const key = observableKey({ typeKey, value });
  const repeatsField = fieldObservables.some(
    (observable) => observable.id !== observableId && observableKey(observable) === key
  );
  const repeatsType = (
    await clientArgs.services.observableService.findExisting(caseId, [{ typeKey, value }])
  ).some((observable) => observable.id !== observableId);

  if (repeatsField || repeatsType) {
    throw Boom.badRequest('Invalid duplicated observables in request.');
  }
};

const validateObservableTypeKeys = async (
  casesClient: CasesClient,
  theCase: CaseSavedObjectTransformed,
  observables: ObservablePost[]
) => {
  const typeKeys = [...new Set(observables.map(({ typeKey }) => typeKey))];

  await Promise.all(
    typeKeys.map((observableTypeKey) =>
      validateObservableTypeKeyExists(casesClient, {
        caseOwner: theCase.attributes.owner,
        observableTypeKey,
      })
    )
  );
};

export const addObservable = async (
  caseId: string,
  params: AddObservableRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService },
    authorization,
  } = clientArgs;

  await ensurePlatinum(clientArgs, ADD_LICENSE_MESSAGE);

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

    if (applied.skippedOverCap.length > 0) {
      throw Boom.forbidden(
        `Max ${MAX_STORED_OBSERVABLES_PER_CASE} observables per case is allowed.`
      );
    }

    if (!applied.caseWithPatch) {
      throw Boom.badRequest('Invalid duplicated observables in request.');
    }

    // Decode before emitting — if the SO fails CaseSchema validation, we must not fire
    // the trigger for a request the API will report as failed. Matches the precedent
    // in create.ts where decodeOrThrow runs before the emit.
    const result = await buildCaseResponse(applied.caseWithPatch, clientArgs);
    return {
      result,
      caseForEmit: applied.caseWithPatch,
      observablesForEmit: applied.newlyAddedObservables,
    };
  })().catch((error) => {
    throw Boom.badRequest(`Failed to add observable: ${error}`);
  });

  emitObservablesAddedEvent(clientArgs, caseForEmit, observablesForEmit);
  return decodedCase;
};

export const updateObservable = async (
  caseId: string,
  observableId: string,
  params: UpdateObservableRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService, observableService },
    authorization,
    user,
  } = clientArgs;

  await ensurePlatinum(clientArgs, UPDATE_LICENSE_MESSAGE);

  try {
    const paramArgs = decodeWithExcessOrThrowZod(UpdateObservableRequestSchema)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    const fieldObservables = retrievedCase.attributes.observables ?? [];
    const fieldObservable = fieldObservables.find(({ id }) => id === observableId);

    if (fieldObservable) {
      // An edited observable stays in the store that holds it: here, the case field.
      if (paramArgs.observable.value !== fieldObservable.value) {
        await ensureNoRepeatAcrossStores({
          caseId,
          observableId,
          typeKey: fieldObservable.typeKey,
          value: paramArgs.observable.value,
          fieldObservables,
          clientArgs,
        });
      }

      const { retrievedCase: latestCase, caseWithPatch } = await writeObservablesWithRetry({
        caseId,
        prefetchedCase: retrievedCase,
        clientArgs,
        compute: (currentCase) => {
          const currentObservables = currentCase.attributes.observables ?? [];

          const observableIndex = currentObservables.findIndex(
            (observable) => observable.id === observableId
          );

          if (observableIndex === -1) {
            throw Boom.notFound(
              `Failed to update observable: observable id ${observableId} not found`
            );
          }

          validateChangedObservableLengths(
            currentObservables[observableIndex],
            paramArgs.observable
          );
          validateObservableValue(
            currentObservables[observableIndex].typeKey,
            paramArgs.observable.value
          );

          const updatedObservables = [...currentObservables];
          updatedObservables[observableIndex] = {
            ...updatedObservables[observableIndex],
            ...paramArgs.observable,
            updatedAt: new Date().toISOString(),
          };

          validateDuplicatedObservablesInRequest({
            requestFields: updatedObservables,
          });

          return { observables: updatedObservables, result: undefined };
        },
      });

      await recordObservablesUserAction(latestCase, 1, 'update', clientArgs);
      return await buildCaseResponse(caseWithPatch, clientArgs);
    }

    const {
      found: [storedObservable],
    } = await observableService.getForCase(caseId, [observableId]);

    if (!storedObservable) {
      throw Boom.notFound(`Failed to update observable: observable id ${observableId} not found`);
    }

    const stored = toObservable(storedObservable);
    validateChangedObservableLengths(stored, paramArgs.observable);
    validateObservableValue(stored.typeKey, paramArgs.observable.value);

    if (paramArgs.observable.value !== stored.value) {
      await ensureNoRepeatAcrossStores({
        caseId,
        observableId,
        typeKey: stored.typeKey,
        value: paramArgs.observable.value,
        fieldObservables,
        clientArgs,
      });
    }

    await observableService.update({
      id: observableId,
      version: storedObservable.version,
      attributes: {
        value: paramArgs.observable.value,
        description: paramArgs.observable.description ?? null,
        updated_at: new Date().toISOString(),
        updated_by: user,
      },
    });

    const { caseWithPatch } = await patchObservablesTotal(retrievedCase, clientArgs);
    await recordObservablesUserAction(retrievedCase, 1, 'update', clientArgs);

    return await buildCaseResponse(caseWithPatch, clientArgs);
  } catch (error) {
    throw Boom.badRequest(`Failed to update observable: ${error}`);
  }
};

export const deleteObservable = async (
  caseId: string,
  observableId: string,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService, observableService },
    authorization,
  } = clientArgs;

  await ensurePlatinum(clientArgs, DELETE_LICENSE_MESSAGE);

  try {
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    const isInField = (retrievedCase.attributes.observables ?? []).some(
      ({ id }) => id === observableId
    );

    if (isInField) {
      const { retrievedCase: latestCase } = await writeObservablesWithRetry({
        caseId,
        prefetchedCase: retrievedCase,
        clientArgs,
        compute: (currentCase) => {
          const updatedObservables = currentCase.attributes.observables.filter(
            (observable) => observable.id !== observableId
          );

          // NOTE: same length of observables pre and post filter means that the observable id has not been found
          if (updatedObservables.length === currentCase.attributes.observables.length) {
            throw Boom.notFound(
              `Failed to delete observable: observable id ${observableId} not found`
            );
          }

          return { observables: updatedObservables, result: undefined };
        },
      });

      await recordObservablesUserAction(latestCase, 1, 'delete', clientArgs);
      return;
    }

    const { found } = await observableService.getForCase(caseId, [observableId]);

    if (found.length === 0) {
      throw Boom.notFound(`Failed to delete observable: observable id ${observableId} not found`);
    }

    await observableService.bulkDelete([observableId]);
    await patchObservablesTotal(retrievedCase, clientArgs);
    await recordObservablesUserAction(retrievedCase, 1, 'delete', clientArgs);
  } catch (error) {
    throw Boom.badRequest(`Failed to delete observable id: ${observableId}: ${error}`);
  }
};

export const bulkAddObservables = async (
  params: BulkAddObservablesRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService },
    authorization,
  } = clientArgs;

  await ensurePlatinum(clientArgs, ADD_LICENSE_MESSAGE);

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

    await validateObservableTypeKeys(casesClient, retrievedCase, paramArgs.observables);

    const applied = await applyObservablesToCase(
      paramArgs.caseId,
      paramArgs.observables,
      clientArgs,
      retrievedCase
    );
    if (!applied.caseWithPatch) {
      throw Boom.badRequest(`Failed to add observable`);
    }

    const result = await buildCaseResponse(applied.caseWithPatch, clientArgs);
    return {
      result,
      caseForEmit: applied.caseWithPatch,
      observablesForEmit: applied.newlyAddedObservables,
    };
  })().catch((error) => {
    throw Boom.badRequest(`Failed to add observable: ${error}`);
  });

  emitObservablesAddedEvent(clientArgs, caseForEmit, observablesForEmit);
  return decodedCase;
};

/**
 * Adds up to 1,000 observables and reports the ones that were not added, instead of failing when
 * none were. Backs the internal bulk create route.
 */
export const bulkCreateObservables = async (
  caseId: string,
  params: BulkCreateObservablesRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<BulkCreateObservablesResponse> => {
  const {
    services: { caseService },
    authorization,
  } = clientArgs;

  await ensurePlatinum(clientArgs, ADD_LICENSE_MESSAGE);

  const paramArgs = decodeWithExcessOrThrowZod(BulkCreateObservablesRequestSchema)(params);
  const retrievedCase = await caseService.getCase({ id: caseId });
  await ensureUpdateAuthorized(authorization, retrievedCase);

  await validateObservableTypeKeys(casesClient, retrievedCase, paramArgs.observables);
  paramArgs.observables.forEach(({ typeKey, value }) => validateObservableValue(typeKey, value));

  const applied = await applyObservablesToCase(
    caseId,
    paramArgs.observables,
    clientArgs,
    retrievedCase
  );

  if (applied.caseWithPatch) {
    emitObservablesAddedEvent(clientArgs, applied.caseWithPatch, applied.newlyAddedObservables);
  }

  return {
    added: applied.newlyAddedObservables,
    skipped_duplicates: applied.skippedDuplicates,
    skipped_over_cap: applied.skippedOverCap,
    total_observables: applied.totalObservables,
  };
};

export const bulkDeleteObservables = async (
  params: BulkDeleteObservablesRequest,
  clientArgs: CasesClientArgs
) => {
  const {
    services: { caseService, observableService },
    authorization,
  } = clientArgs;

  await ensurePlatinum(clientArgs, DELETE_LICENSE_MESSAGE);

  const paramArgs = decodeWithExcessOrThrowZod(BulkDeleteObservablesRequestSchema)(params);
  const retrievedCase = await caseService.getCase({ id: paramArgs.caseId });
  await ensureUpdateAuthorized(authorization, retrievedCase);

  const idsToDelete = new Set(paramArgs.observableIds);
  const fieldIds = new Set(
    (retrievedCase.attributes.observables ?? [])
      .map(({ id }) => id)
      .filter((id) => idsToDelete.has(id))
  );
  const typeIds = [...idsToDelete].filter((id) => !fieldIds.has(id));

  const { found, missingIds } = await observableService.getForCase(paramArgs.caseId, typeIds);
  if (missingIds.length > 0) {
    throw Boom.notFound(
      `Failed to bulk delete observables: observable ids not found: ${missingIds.join(', ')}`
    );
  }

  await observableService.bulkDelete(found.map(({ id }) => id));

  let latestCase = retrievedCase;
  let caseWithPatch: CaseSavedObjectTransformed;

  if (fieldIds.size > 0) {
    const written = await writeObservablesWithRetry({
      caseId: paramArgs.caseId,
      prefetchedCase: retrievedCase,
      clientArgs,
      compute: (currentCase) => {
        const currentObservables = currentCase.attributes.observables ?? [];
        const currentIdSet = new Set(currentObservables.map(({ id }) => id));

        const missingFieldIds = [...fieldIds].filter((id) => !currentIdSet.has(id));
        if (missingFieldIds.length > 0) {
          throw Boom.notFound(
            `Failed to bulk delete observables: observable ids not found: ${missingFieldIds.join(
              ', '
            )}`
          );
        }

        return {
          observables: currentObservables.filter((observable) => !fieldIds.has(observable.id)),
          result: undefined,
        };
      },
    });
    latestCase = written.retrievedCase;
    caseWithPatch = written.caseWithPatch;
  } else {
    caseWithPatch = (await patchObservablesTotal(retrievedCase, clientArgs)).caseWithPatch;
  }

  await recordObservablesUserAction(latestCase, idsToDelete.size, 'delete', clientArgs);

  return buildCaseResponse(caseWithPatch, clientArgs);
};
