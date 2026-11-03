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
  type ObservablePost,
} from '../../../common/types/api';
import {
  AddObservableRequestSchema,
  UpdateObservableRequestSchema,
  BulkAddObservablesRequestSchema,
  BulkDeleteObservablesRequestSchema,
} from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import type { Authorization } from '../../authorization';
import { Operations } from '../../authorization';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { flattenCaseSavedObject } from '../../common/utils';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import {
  validateDuplicatedObservablesInRequest,
  validateObservableTypeKeyExists,
  validateObservableValue,
} from '../validators';
import { processObservables } from './utils';
import { getObservableSource, mirrorToObservablesIndex } from './observables_index_sync';
import type { ObservablesSyncAttributes } from './observables_index_sync';
import type { ObservableSource } from '../../services/observables';
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

interface ObservablesWrite<TResult> {
  observables: Observable[];
  result: TResult;
  /** The observables whose index documents this change creates, rewrites or deletes. */
  involved: Observable[];
  /** Applies the change of this attempt to the observables index. */
  writeToIndex: () => Promise<void>;
}

interface ObservablesWriteArgs<TResult, TComputed extends ObservablesWrite<TResult> | undefined> {
  caseId: string;
  prefetchedCase?: CaseSavedObjectTransformed;
  clientArgs: CasesClientArgs;
  /** How a repair after a lost race records an observable the index is missing. */
  source: ObservableSource;
  compute: (retrievedCase: CaseSavedObjectTransformed) => TComputed;
}

type PatchedCase = Awaited<ReturnType<CasesClientArgs['services']['caseService']['patchCase']>>;

interface ObservablesWriteOutcome<TResult> {
  retrievedCase: CaseSavedObjectTransformed;
  patchedCase: PatchedCase;
  result: TResult;
}

/**
 * Reads the case, lets `compute` derive the new observables list from it, writes the change to the
 * observables index and writes the list with the case version. On a version conflict the case is
 * re-read and the attempt runs again, so a concurrent writer's observables are never overwritten. The
 * sync task relies on the index write being redone: it can remove a document while this write is in
 * flight, and the version conflict it causes brings the document back. `compute` returns undefined
 * when there is nothing to write.
 *
 * An attempt that wrote to the index and then lost the race can leave documents that no later attempt
 * keeps, for example observables that no longer fit under the cap, or its own copy of an observable
 * another writer added with a different id. So the next attempt makes the documents of every
 * observable an attempt touched match what it stores, and its versioned case update fences that repair
 * against other writers. It updates the case even with nothing left to store, for the fence. Documents
 * of other observables are never touched, so a case written by a later release with a higher cap keeps
 * the observables beyond its preview.
 *
 * Where reads come from decides what a failed index write does. While the case field is the source of
 * truth, the failure is recorded with the case update and the sync task repairs the index. Once reads
 * come from the index, the request fails before the case changes. Either way, a write whose case update
 * fails after its index write, or that runs out of retries, flags the case for the sync task.
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
  source,
  compute,
}: ObservablesWriteArgs<TResult, ObservablesWrite<TResult> | undefined>): Promise<
  ObservablesWriteOutcome<TResult> | undefined
> {
  // Decided once, so a request that started before the switch finishes the way it started.
  const indexFirst = clientArgs.services.observablesStorageMode.isIndexFirst();
  const involvedInLostAttempts: Observable[] = [];

  for (let attempt = 1; attempt <= MAX_OBSERVABLES_WRITE_ATTEMPTS; attempt++) {
    const afterLostAttempt = involvedInLostAttempts.length > 0;
    const retrievedCase =
      attempt === 1 && prefetchedCase
        ? prefetchedCase
        : await readCaseForAttempt({
            clientArgs,
            caseId,
            indexTouchedByLostAttempt: afterLostAttempt,
          });

    let write: ObservablesWrite<TResult> | undefined;
    let rejection: { error: unknown } | undefined;
    try {
      write = compute(retrievedCase);
    } catch (error) {
      if (!afterLostAttempt) {
        throw error;
      }
      rejection = { error };
    }

    if (!write && !afterLostAttempt) {
      return;
    }

    const observables = write?.observables ?? retrievedCase.attributes.observables ?? [];
    const syncAttributes = await writeAttemptToIndex({
      clientArgs,
      indexFirst,
      theCase: retrievedCase,
      observables,
      write,
      involvedInLostAttempts,
      source,
    });
    const patchedCase = await patchCaseForAttempt({
      clientArgs,
      theCase: retrievedCase,
      observables,
      syncAttributes,
    });

    if (patchedCase) {
      if (rejection) {
        throw rejection.error;
      }
      if (!write) {
        return;
      }
      return { retrievedCase, patchedCase, result: write.result };
    }

    involvedInLostAttempts.push(...(write?.involved ?? []));
  }

  await flagCasePendingSync({ clientArgs, caseId });

  throw Boom.conflict(
    `The observables of case ${caseId} were modified concurrently ${MAX_OBSERVABLES_WRITE_ATTEMPTS} times in a row. Retry the request.`
  );
}

/**
 * Writes one attempt to the observables index. The first attempt applies its own change. An attempt
 * after a lost one instead makes the documents of every observable an attempt touched match the
 * observables it stores. Returns what the case update of the attempt records about the index write.
 */
const writeAttemptToIndex = async <TResult>({
  clientArgs,
  indexFirst,
  theCase,
  observables,
  write,
  involvedInLostAttempts,
  source,
}: {
  clientArgs: CasesClientArgs;
  indexFirst: boolean;
  theCase: CaseSavedObjectTransformed;
  observables: Observable[];
  write?: ObservablesWrite<TResult>;
  involvedInLostAttempts: Observable[];
  source: ObservableSource;
}): Promise<ObservablesSyncAttributes> => {
  const {
    services: { observablesService },
    logger,
    spaceId,
  } = clientArgs;

  const writeToIndex =
    write && involvedInLostAttempts.length === 0
      ? write.writeToIndex
      : async () => {
          await observablesService.syncObservables({
            caseId: theCase.id,
            spaceId,
            owner: theCase.attributes.owner,
            observables,
            involved: [...involvedInLostAttempts, ...(write?.involved ?? [])],
            source,
          });
        };

  if (!indexFirst) {
    return mirrorToObservablesIndex({ caseId: theCase.id, logger, write: writeToIndex });
  }

  try {
    await writeToIndex();
    return {};
  } catch (error) {
    logger.error(
      `[observables] Failed to write the observables of case ${theCase.id} to the observables index; the change is rejected and the case is flagged for the sync. Error: ${error}`,
      { error: { stack_trace: error instanceof Error ? error.stack : undefined } }
    );
    await flagCasePendingSync({ clientArgs, caseId: theCase.id });
    throw error;
  }
};

/**
 * Writes the observables of one attempt to the case with the version it read. Returns undefined when
 * another writer changed the case first. Any other failure flags the case, since the index was already
 * written, and is rethrown.
 */
const patchCaseForAttempt = async ({
  clientArgs,
  theCase,
  observables,
  syncAttributes,
}: {
  clientArgs: CasesClientArgs;
  theCase: CaseSavedObjectTransformed;
  observables: Observable[];
  syncAttributes: ObservablesSyncAttributes;
}): Promise<PatchedCase | undefined> => {
  try {
    return await clientArgs.services.caseService.patchCase({
      caseId: theCase.id,
      originalCase: theCase,
      version: theCase.version,
      updatedAttributes: {
        observables,
        total_observables: observables.length,
        ...syncAttributes,
      },
    });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isConflictError(error as Error)) {
      return undefined;
    }
    // A deleted case has nothing left to flag: the sync removes the documents of deleted cases.
    if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
      await flagCasePendingSync({ clientArgs, caseId: theCase.id });
    }
    throw error;
  }
};

/**
 * Reads the case again for a retry. When an earlier attempt already wrote to the index and the read
 * fails, the case is flagged before the error is rethrown, so the sync task repairs what that attempt
 * left. A deleted case needs no flag: the sync removes the documents of deleted cases.
 */
const readCaseForAttempt = async ({
  clientArgs,
  caseId,
  indexTouchedByLostAttempt,
}: {
  clientArgs: CasesClientArgs;
  caseId: string;
  indexTouchedByLostAttempt: boolean;
}): Promise<CaseSavedObjectTransformed> => {
  try {
    return await clientArgs.services.caseService.getCase({ id: caseId });
  } catch (error) {
    if (indexTouchedByLostAttempt && !SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
      await flagCasePendingSync({ clientArgs, caseId });
    }
    throw error;
  }
};

/**
 * Flags a case for the sync task after a write that may have left the observables index different
 * from the case. Only the flag is written, without a version: writers only ever set the flag, and the
 * sync task clears it with a versioned update once it has made the index match the case.
 */
const flagCasePendingSync = async ({
  clientArgs,
  caseId,
}: {
  clientArgs: CasesClientArgs;
  caseId: string;
}): Promise<void> => {
  const {
    services: { caseService },
    logger,
  } = clientArgs;

  try {
    await caseService.flagObservablesSyncPending({ caseId });
  } catch (error) {
    logger.error(
      `[observables] Failed to flag case ${caseId} as pending sync after an observable write that did not complete. The observables index can differ from the case until the next full sync pass. Error: ${error}`,
      { error: { stack_trace: error instanceof Error ? error.stack : undefined } }
    );
  }
};

/**
 * License-agnostic core that dedupes, caps, persists, and records a user action
 * for a set of observables on a case. Callers MUST enforce the Platinum license
 * gate and call notifyUsage themselves.
 *
 * Skips both the patchCase write and the user action write when no new
 * observables were added (idempotency — avoids a no-op SO write on every
 * re-extraction of the same alert).
 *
 * @param prefetchedCase - Optional already-fetched SO to avoid an extra getCase
 *   round-trip. When provided, `caseId` is ignored for the initial fetch.
 * @param source - How the observables reached the case. Defaults to the origin of the cases client.
 */
export const applyObservablesToCase = async (
  caseId: string,
  observables: ObservablePost[],
  clientArgs: CasesClientArgs,
  prefetchedCase?: CaseSavedObjectTransformed,
  source: ObservableSource = getObservableSource(clientArgs.clientSource)
) => {
  const {
    services: { userActionService, observablesService },
    user,
    spaceId,
  } = clientArgs;

  if (observables.length === 0) {
    return;
  }

  const written = await writeObservablesWithRetry({
    caseId,
    prefetchedCase,
    clientArgs,
    source,
    compute: (retrievedCase) => {
      const currentObservables = retrievedCase.attributes.observables ?? [];
      // Build a key-set from existing observables so we never overwrite or collapse
      // them — even when two stored rows share the same typeKey+value (reachable
      // via SO import or data written before the dedupe path was added).
      const existingKeys = new Set(
        currentObservables.map(({ typeKey, value }) => `${typeKey}-${value}`)
      );

      // Dedupe incoming entries against existing ones and against each other.
      // processObservables mints ids/timestamps for ObservablePost entries and
      // skips repeats, so it is safe to call for every incoming entry.
      const incomingMap = new Map<string, Observable>();
      observables.forEach((observable) => {
        if (existingKeys.has(`${observable.typeKey}-${observable.value}`)) {
          return;
        }
        processObservables(incomingMap, observable);
      });

      // Respect the per-case cap: add as many new observables as fit.
      const remainingCapacity = Math.max(0, MAX_OBSERVABLES_PER_CASE - currentObservables.length);
      const newlyAddedObservables = Array.from(incomingMap.values()).slice(0, remainingCapacity);

      // Nothing new was added — skip both the patch write and the user action to
      // avoid a no-op SO write on every idempotent re-extraction (e.g. the same
      // alert being attached multiple times).
      if (newlyAddedObservables.length === 0) {
        return;
      }

      return {
        observables: [...currentObservables, ...newlyAddedObservables],
        result: newlyAddedObservables,
        involved: newlyAddedObservables,
        writeToIndex: () =>
          observablesService.createObservables({
            caseId: retrievedCase.id,
            spaceId,
            owner: retrievedCase.attributes.owner,
            observables: newlyAddedObservables,
            source,
          }),
      };
    },
  });

  if (!written) {
    return;
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
    services: { caseService, licensingService },
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

    const currentObservables = retrievedCase.attributes.observables ?? [];

    if (currentObservables.length === MAX_OBSERVABLES_PER_CASE) {
      throw Boom.forbidden(`Max ${MAX_OBSERVABLES_PER_CASE} observables per case is allowed.`);
    }

    const applied = await applyObservablesToCase(
      caseId,
      [paramArgs.observable],
      clientArgs,
      retrievedCase
    );
    if (!applied) {
      throw Boom.badRequest('Invalid duplicated observables in request.');
    }

    const res = flattenCaseSavedObject({ savedObject: applied.caseWithPatch });

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
    services: { caseService, licensingService, userActionService, observablesService },
    authorization,
    user,
    spaceId,
    clientSource,
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

    const written = await writeObservablesWithRetry({
      caseId,
      prefetchedCase: retrievedCase,
      clientArgs,
      source: getObservableSource(clientSource),
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

        return {
          observables: updatedObservables,
          result: undefined,
          involved: [currentObservables[observableIndex], updatedObservables[observableIndex]],
          // Synced against the stored list rather than rewritten blindly: another observable of the
          // case can share the previous value, and its document must stay.
          writeToIndex: async () => {
            await observablesService.syncObservables({
              caseId: currentCase.id,
              spaceId,
              owner: currentCase.attributes.owner,
              observables: updatedObservables,
              involved: [currentObservables[observableIndex], updatedObservables[observableIndex]],
              source: getObservableSource(clientSource),
            });
          },
        };
      },
    });

    const { retrievedCase: latestCase, patchedCase: updatedCase } = written;

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

    const res = flattenCaseSavedObject({
      savedObject: {
        ...latestCase,
        ...updatedCase,
        attributes: { ...latestCase.attributes, ...updatedCase?.attributes },
        references: latestCase.references,
      },
    });

    return decodeOrThrowZod(CaseSchema)(res);
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
    services: { caseService, licensingService, userActionService, observablesService },
    authorization,
    user,
    spaceId,
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

    const { retrievedCase: latestCase } = await writeObservablesWithRetry({
      caseId,
      prefetchedCase: retrievedCase,
      clientArgs,
      source: getObservableSource(clientArgs.clientSource),
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

        const removedObservables = currentCase.attributes.observables.filter(
          (observable) => observable.id === observableId
        );

        return {
          observables: updatedObservables,
          result: undefined,
          involved: removedObservables,
          // Another observable of the case can share the value of the removed one, and its document
          // must stay, so the documents are synced against the stored list.
          writeToIndex: async () => {
            await observablesService.syncObservables({
              caseId: currentCase.id,
              spaceId,
              owner: currentCase.attributes.owner,
              observables: updatedObservables,
              involved: removedObservables,
              source: getObservableSource(clientArgs.clientSource),
            });
          },
        };
      },
    });

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
    throw Boom.badRequest(`Failed to delete observable id: ${observableId}: ${error}`);
  }
};

export const bulkAddObservables = async (
  params: BulkAddObservablesRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService, licensingService },
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
    if (!applied) {
      throw Boom.badRequest(`Failed to add observable`);
    }
    const res = flattenCaseSavedObject({ savedObject: applied.caseWithPatch });
    const result = decodeOrThrowZod(CaseSchema)(res);
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

export const bulkDeleteObservables = async (
  params: BulkDeleteObservablesRequest,
  clientArgs: CasesClientArgs
) => {
  const {
    services: { caseService, licensingService, userActionService, observablesService },
    authorization,
    user,
    spaceId,
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

  const {
    retrievedCase: latestCase,
    patchedCase: updatedCase,
    result: removedCount,
  } = await writeObservablesWithRetry({
    caseId: paramArgs.caseId,
    prefetchedCase: retrievedCase,
    clientArgs,
    source: getObservableSource(clientArgs.clientSource),
    compute: (currentCase) => {
      const currentObservables = currentCase.attributes.observables ?? [];
      const currentIdSet = new Set(currentObservables.map(({ id }) => id));

      const missingIds = [...idsToDelete].filter((id) => !currentIdSet.has(id));
      if (missingIds.length > 0) {
        throw Boom.notFound(
          `Failed to bulk delete observables: observable ids not found: ${missingIds.join(', ')}`
        );
      }

      const removedObservables = currentObservables.filter((observable) =>
        idsToDelete.has(observable.id)
      );
      const updatedObservables = currentObservables.filter(
        (observable) => !idsToDelete.has(observable.id)
      );

      return {
        observables: updatedObservables,
        result: removedObservables.length,
        involved: removedObservables,
        // Another observable of the case can share the value of a removed one, and its document must
        // stay, so the documents are synced against the stored list.
        writeToIndex: async () => {
          await observablesService.syncObservables({
            caseId: currentCase.id,
            spaceId,
            owner: currentCase.attributes.owner,
            observables: updatedObservables,
            involved: removedObservables,
            source: getObservableSource(clientArgs.clientSource),
          });
        },
      };
    },
  });

  await userActionService.creator.createUserAction({
    userAction: {
      type: UserActionTypes.observables,
      caseId: latestCase.id,
      owner: latestCase.attributes.owner,
      user,
      payload: {
        observables: { count: removedCount, actionType: 'delete' },
      },
    },
  });

  const res = flattenCaseSavedObject({
    savedObject: {
      ...latestCase,
      ...updatedCase,
      attributes: { ...latestCase.attributes, ...updatedCase?.attributes },
      references: latestCase.references,
    },
  });

  const result = decodeOrThrowZod(CaseSchema)(res);
  return result;
};
