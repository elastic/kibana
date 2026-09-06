/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { v4 } from 'uuid';
import Boom from '@hapi/boom';

import { MAX_OBSERVABLES_PER_CASE } from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import { CaseRt, UserActionTypes } from '../../../common/types/domain';
import {
  AddObservableRequestRt,
  type AddObservableRequest,
  type UpdateObservableRequest,
  UpdateObservableRequestRt,
  type BulkAddObservablesRequest,
  BulkAddObservablesRequestRt,
  type ObservablePost,
} from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { decodeOrThrow, decodeWithExcessOrThrow } from '../../common/runtime_types';
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
 */
export const applyObservablesToCase = async (
  caseId: string,
  observables: ObservablePost[],
  clientArgs: CasesClientArgs,
  prefetchedCase?: CaseSavedObjectTransformed
) => {
  const {
    services: { caseService, userActionService },
    user,
  } = clientArgs;

  if (observables.length === 0) {
    return;
  }

  const retrievedCase = prefetchedCase ?? (await caseService.getCase({ id: caseId }));

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

  const finalObservables = [...currentObservables, ...newlyAddedObservables];

  const patchedCase = await caseService.patchCase({
    caseId: retrievedCase.id,
    originalCase: retrievedCase,
    updatedAttributes: {
      observables: finalObservables,
      total_observables: finalObservables.length,
    },
  });

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
    services: { caseService, licensingService, userActionService },
    authorization,
    user,
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
  // a 400 — and a decode failure (CaseRt) must not silently skip the emit for a
  // write that the API reports as failed. Both invariants require the emit to sit
  // after the try/catch, which `.catch` makes possible without `let` variables.
  const {
    result: decodedCase,
    caseForEmit,
    observableForEmit,
  } = await (async () => {
    const paramArgs = decodeWithExcessOrThrow(AddObservableRequestRt)(params);
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

    const newObservable = {
      ...paramArgs.observable,
      id: v4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedObservables = [...currentObservables, newObservable];

    validateDuplicatedObservablesInRequest({
      requestFields: updatedObservables,
    });

    const updatedCase = await caseService.patchCase({
      caseId: retrievedCase.id,
      originalCase: retrievedCase,
      updatedAttributes: {
        observables: updatedObservables,
        total_observables: updatedObservables.length,
      },
    });

    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.observables,
        caseId: retrievedCase.id,
        owner: retrievedCase.attributes.owner,
        user,
        payload: {
          observables: { count: 1, actionType: 'add' },
        },
      },
    });

    const res = flattenCaseSavedObject({
      savedObject: {
        ...retrievedCase,
        ...updatedCase,
        attributes: { ...retrievedCase.attributes, ...updatedCase?.attributes },
        references: retrievedCase.references,
      },
    });

    // Decode before emitting — if the SO fails CaseRt validation, we must not fire
    // the trigger for a request the API will report as failed. Matches the precedent
    // in create.ts where decodeOrThrow runs before the emit.
    const result = decodeOrThrow(CaseRt)(res);
    return { result, caseForEmit: retrievedCase, observableForEmit: newObservable };
  })().catch((error) => {
    throw Boom.badRequest(`Failed to add observable: ${error}`);
  });

  emitObservablesAddedEvent(clientArgs, caseForEmit, [observableForEmit]);
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
    services: { caseService, licensingService, userActionService },
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
    const paramArgs = decodeWithExcessOrThrow(UpdateObservableRequestRt)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    const currentObservables = retrievedCase.attributes.observables ?? [];

    const observableIndex = currentObservables.findIndex(
      (observable) => observable.id === observableId
    );

    if (observableIndex === -1) {
      throw Boom.notFound(`Failed to update observable: observable id ${observableId} not found`);
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

    const updatedCase = await caseService.patchCase({
      caseId: retrievedCase.id,
      originalCase: retrievedCase,
      updatedAttributes: {
        observables: updatedObservables,
        total_observables: updatedObservables.length,
      },
    });

    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.observables,
        caseId: retrievedCase.id,
        owner: retrievedCase.attributes.owner,
        user,
        payload: {
          observables: { count: 1, actionType: 'update' },
        },
      },
    });

    const res = flattenCaseSavedObject({
      savedObject: {
        ...retrievedCase,
        ...updatedCase,
        attributes: { ...retrievedCase.attributes, ...updatedCase?.attributes },
        references: retrievedCase.references,
      },
    });

    return decodeOrThrow(CaseRt)(res);
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

    const updatedObservables = retrievedCase.attributes.observables.filter(
      (observable) => observable.id !== observableId
    );

    // NOTE: same length of observables pre and post filter means that the observable id has not been found
    if (updatedObservables.length === retrievedCase.attributes.observables.length) {
      throw Boom.notFound(`Failed to delete observable: observable id ${observableId} not found`);
    }

    await caseService.patchCase({
      caseId: retrievedCase.id,
      originalCase: retrievedCase,
      updatedAttributes: {
        observables: updatedObservables,
        total_observables: updatedObservables.length,
      },
    });
    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.observables,
        caseId: retrievedCase.id,
        owner: retrievedCase.attributes.owner,
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
  // and the decode must precede the emit so a CaseRt failure does not fire the
  // trigger for a request the API will report as failed.
  const {
    result: decodedCase,
    caseForEmit,
    observablesForEmit,
  } = await (async () => {
    const paramArgs = decodeWithExcessOrThrow(BulkAddObservablesRequestRt)(params);
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
    const result = decodeOrThrow(CaseRt)(res);
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
