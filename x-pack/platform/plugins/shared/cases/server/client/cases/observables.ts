/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import Boom from '@hapi/boom';

import { MAX_STORED_OBSERVABLES_PER_CASE } from '../../../common/constants';
import type { Case, Observable } from '../../../common/types/domain';
import { UserActionTypes, CaseSchema } from '../../../common/types/domain';
import {
  type AddObservableRequest,
  type UpdateObservableRequest,
  type BulkAddObservablesRequest,
  type BulkCreateObservablesRequest,
  type BulkCreateObservablesResponse,
  type BulkDeleteObservablesRequest,
  type FindObservablesRequest,
  type FindObservablesResponse,
  type ObservablePost,
} from '../../../common/types/api';
import {
  AddObservableRequestSchema,
  UpdateObservableRequestSchema,
  BulkAddObservablesRequestSchema,
  BulkCreateObservablesRequestSchema,
  BulkDeleteObservablesRequestSchema,
  FindObservablesRequestSchema,
} from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import type { Authorization } from '../../authorization';
import { Operations } from '../../authorization';
import type { OperationDetails } from '../../authorization/types';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { flattenCaseSavedObject } from '../../common/utils';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import { validateObservableTypeKeyExists, validateObservableValue } from '../validators';
import { emitObservablesAddedEvent } from './trigger_utils';
import {
  countCaseObservables,
  createCaseObservables,
  deleteCaseObservables,
  findCaseObservables,
  getCaseObservable,
  getCaseObservables,
  getObservablesSummary,
  observableKey,
  updateCaseObservableDescription,
  withObservablesSummary,
} from './observables_storage';

const ensureAuthorized = async (
  authorization: PublicMethodsOf<Authorization>,
  theCase: CaseSavedObjectTransformed,
  operation: OperationDetails = Operations.updateCase
) => {
  return authorization.ensureAuthorized({
    operation,
    entities: [
      {
        id: theCase.id,
        owner: theCase.attributes.owner,
      },
    ],
  });
};

const ensurePlatinumLicense = async (
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

const recordObservablesUserAction = async (
  clientArgs: CasesClientArgs,
  theCase: CaseSavedObjectTransformed,
  count: number,
  actionType: 'add' | 'update' | 'delete'
) => {
  await clientArgs.services.userActionService.creator.createUserAction({
    userAction: {
      type: UserActionTypes.observables,
      caseId: theCase.id,
      owner: theCase.attributes.owner,
      user: clientArgs.user,
      payload: { observables: { count, actionType } },
    },
  });
};

/** Builds a case response whose `observables` preview and total come from the stored observables. */
const buildCaseResponse = async (
  theCase: CaseSavedObjectTransformed,
  clientArgs: CasesClientArgs
): Promise<Case> => {
  const summaries = await getObservablesSummary([theCase.id], clientArgs);
  const res = withObservablesSummary(flattenCaseSavedObject({ savedObject: theCase }), summaries);
  return decodeOrThrowZod(CaseSchema)(res);
};

export interface ApplyObservablesResult {
  theCase: CaseSavedObjectTransformed;
  newlyAddedObservables: Observable[];
  duplicates: number;
  overCap: number;
  totalObservables: number;
}

/**
 * License-agnostic core that dedupes, caps, persists, and records a user action
 * for a set of observables on a case. Callers MUST enforce the Platinum license
 * gate and call notifyUsage themselves.
 *
 * Each observable is its own attachment with an id derived from the case, type key and value,
 * so an observable the case already holds is reported as a duplicate without reading the case's
 * observables. The case document is never written. The cap is checked with a count before the
 * write, so concurrent writers can pass it by their request sizes.
 */
export const applyObservablesToCase = async (
  caseId: string,
  observables: ObservablePost[],
  clientArgs: CasesClientArgs,
  prefetchedCase?: CaseSavedObjectTransformed
): Promise<ApplyObservablesResult> => {
  const theCase = prefetchedCase ?? (await clientArgs.services.caseService.getCase({ id: caseId }));

  const unique = new Map<string, ObservablePost>();
  observables.forEach((observable) => {
    const key = observableKey(observable);
    if (!unique.has(key)) {
      unique.set(key, observable);
    }
  });
  const requested = [...unique.values()];
  const duplicatesInRequest = observables.length - requested.length;

  const existingCount = await countCaseObservables(theCase.id, clientArgs);
  const room = Math.max(0, MAX_STORED_OBSERVABLES_PER_CASE - existingCount);
  const toCreate = requested.slice(0, room);

  const { added, duplicates } = await createCaseObservables({
    caseId: theCase.id,
    owner: theCase.attributes.owner,
    observables: toCreate,
    clientArgs,
  });

  if (added.length > 0) {
    await recordObservablesUserAction(clientArgs, theCase, added.length, 'add');
  }

  return {
    theCase,
    newlyAddedObservables: added,
    duplicates: duplicates + duplicatesInRequest,
    overCap: requested.length - toCreate.length,
    totalObservables: existingCount + added.length,
  };
};

const validateTypeKeys = async (
  casesClient: CasesClient,
  theCase: CaseSavedObjectTransformed,
  observables: ObservablePost[]
) => {
  const typeKeys = new Set(observables.map(({ typeKey }) => typeKey));
  await Promise.all(
    [...typeKeys].map((observableTypeKey) =>
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
  await ensurePlatinumLicense(clientArgs, ADD_LICENSE_MESSAGE);

  // Extract into an inner function so the emit can run outside the error-wrapping
  // boundary. A throw from the event bus must not turn a fully-committed write into
  // a 400 — and a decode failure (CaseSchema) must not silently skip the emit for a
  // write that the API reports as failed.
  const { result, applied } = await (async () => {
    const paramArgs = decodeWithExcessOrThrowZod(AddObservableRequestSchema)(params);
    const retrievedCase = await clientArgs.services.caseService.getCase({ id: caseId });
    await ensureAuthorized(clientArgs.authorization, retrievedCase);

    await validateTypeKeys(casesClient, retrievedCase, [paramArgs.observable]);
    validateObservableValue(paramArgs.observable.typeKey, paramArgs.observable.value);

    const appliedResult = await applyObservablesToCase(
      caseId,
      [paramArgs.observable],
      clientArgs,
      retrievedCase
    );

    if (appliedResult.overCap > 0) {
      throw Boom.forbidden(
        `Max ${MAX_STORED_OBSERVABLES_PER_CASE} observables per case is allowed.`
      );
    }

    if (appliedResult.newlyAddedObservables.length === 0) {
      throw Boom.badRequest('Invalid duplicated observables in request.');
    }

    return {
      result: await buildCaseResponse(retrievedCase, clientArgs),
      applied: appliedResult,
    };
  })().catch((error) => {
    throw Boom.badRequest(`Failed to add observable: ${error}`);
  });

  emitObservablesAddedEvent(clientArgs, applied.theCase, applied.newlyAddedObservables);
  return result;
};

export const updateObservable = async (
  caseId: string,
  observableId: string,
  params: UpdateObservableRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  await ensurePlatinumLicense(clientArgs, UPDATE_LICENSE_MESSAGE);

  const {
    services: { caseService },
    authorization,
  } = clientArgs;

  try {
    const paramArgs = decodeWithExcessOrThrowZod(UpdateObservableRequestSchema)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureAuthorized(authorization, retrievedCase);

    const existing = await getCaseObservable(retrievedCase.id, observableId, clientArgs);
    const { typeKey, value: currentValue } = existing.attributes.data;
    const { value, description } = paramArgs.observable;

    validateObservableValue(typeKey, value);

    if (value === currentValue) {
      await updateCaseObservableDescription(
        observableId,
        { typeKey, value, description },
        clientArgs
      );
    } else {
      // The id is derived from the value, so a new value is a new observable. Create first so a
      // duplicate value fails the request before the original is removed.
      const { added } = await createCaseObservables({
        caseId: retrievedCase.id,
        owner: retrievedCase.attributes.owner,
        observables: [{ typeKey, value, description }],
        clientArgs,
      });

      if (added.length === 0) {
        throw Boom.badRequest('Invalid duplicated observables in request.');
      }

      await deleteCaseObservables([observableId], clientArgs);
    }

    await recordObservablesUserAction(clientArgs, retrievedCase, 1, 'update');

    return await buildCaseResponse(retrievedCase, clientArgs);
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
  await ensurePlatinumLicense(clientArgs, DELETE_LICENSE_MESSAGE);

  const {
    services: { caseService },
    authorization,
  } = clientArgs;

  try {
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureAuthorized(authorization, retrievedCase);

    await getCaseObservable(retrievedCase.id, observableId, clientArgs);
    await deleteCaseObservables([observableId], clientArgs);

    await recordObservablesUserAction(clientArgs, retrievedCase, 1, 'delete');
  } catch (error) {
    throw Boom.badRequest(`Failed to delete observable id: ${observableId}: ${error}`);
  }
};

/**
 * Adds up to `MAX_OBSERVABLES_BULK_CREATE` observables and reports how many were added, were
 * already on the case, or did not fit under the per-case cap.
 */
export const bulkCreateObservables = async (
  params: BulkCreateObservablesRequest & { caseId: string },
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<BulkCreateObservablesResponse> => {
  await ensurePlatinumLicense(clientArgs, ADD_LICENSE_MESSAGE);

  const { caseId, ...body } = params;
  const { applied, response } = await (async () => {
    const { observables } = decodeWithExcessOrThrowZod(BulkCreateObservablesRequestSchema)(body);
    const retrievedCase = await clientArgs.services.caseService.getCase({ id: caseId });
    await ensureAuthorized(clientArgs.authorization, retrievedCase);

    await validateTypeKeys(casesClient, retrievedCase, observables);
    observables.forEach(({ typeKey, value }) => validateObservableValue(typeKey, value));

    const appliedResult = await applyObservablesToCase(
      caseId,
      observables,
      clientArgs,
      retrievedCase
    );

    return {
      applied: appliedResult,
      response: {
        added: appliedResult.newlyAddedObservables.length,
        duplicates: appliedResult.duplicates,
        over_cap: appliedResult.overCap,
        total_observables: appliedResult.totalObservables,
      },
    };
  })().catch((error) => {
    throw Boom.boomify(error, {
      statusCode: Boom.isBoom(error) ? error.output.statusCode : 400,
      message: 'Failed to bulk create observables',
    });
  });

  if (applied.newlyAddedObservables.length > 0) {
    emitObservablesAddedEvent(clientArgs, applied.theCase, applied.newlyAddedObservables);
  }

  return response;
};

export const bulkAddObservables = async (
  params: BulkAddObservablesRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  await ensurePlatinumLicense(clientArgs, ADD_LICENSE_MESSAGE);

  // Same inner-function pattern as addObservable: emit must run outside the
  // error-wrapping boundary so bus errors cannot turn a committed write into a 400.
  const { result, applied } = await (async () => {
    const paramArgs = decodeWithExcessOrThrowZod(BulkAddObservablesRequestSchema)(params);
    const retrievedCase = await clientArgs.services.caseService.getCase({ id: paramArgs.caseId });
    await ensureAuthorized(clientArgs.authorization, retrievedCase);

    await validateTypeKeys(casesClient, retrievedCase, paramArgs.observables);

    const appliedResult = await applyObservablesToCase(
      paramArgs.caseId,
      paramArgs.observables,
      clientArgs,
      retrievedCase
    );

    if (appliedResult.newlyAddedObservables.length === 0) {
      throw Boom.badRequest(`Failed to add observable`);
    }

    return {
      result: await buildCaseResponse(retrievedCase, clientArgs),
      applied: appliedResult,
    };
  })().catch((error) => {
    throw Boom.badRequest(`Failed to add observable: ${error}`);
  });

  emitObservablesAddedEvent(clientArgs, applied.theCase, applied.newlyAddedObservables);
  return result;
};

export const bulkDeleteObservables = async (
  params: BulkDeleteObservablesRequest,
  clientArgs: CasesClientArgs
) => {
  await ensurePlatinumLicense(clientArgs, DELETE_LICENSE_MESSAGE);

  const {
    services: { caseService },
    authorization,
  } = clientArgs;

  const paramArgs = decodeWithExcessOrThrowZod(BulkDeleteObservablesRequestSchema)(params);
  const retrievedCase = await caseService.getCase({ id: paramArgs.caseId });
  await ensureAuthorized(authorization, retrievedCase);

  const observableIds = [...new Set(paramArgs.observableIds)];
  const { found, missingIds } = await getCaseObservables(
    retrievedCase.id,
    observableIds,
    clientArgs
  );

  if (missingIds.length > 0) {
    throw Boom.notFound(
      `Failed to bulk delete observables: observable ids not found: ${missingIds.join(', ')}`
    );
  }

  await deleteCaseObservables(
    found.map(({ id }) => id),
    clientArgs
  );

  await recordObservablesUserAction(clientArgs, retrievedCase, found.length, 'delete');

  return buildCaseResponse(retrievedCase, clientArgs);
};

/** Pages a case's observables with server-side sorting and filtering. */
export const findObservables = async (
  params: FindObservablesRequest & { caseId: string },
  clientArgs: CasesClientArgs
): Promise<FindObservablesResponse> => {
  const { caseId, ...body } = params;

  try {
    const { perPage, cursor, sortField, sortOrder, typeKeys, search } = decodeWithExcessOrThrowZod(
      FindObservablesRequestSchema
    )(body);

    const retrievedCase = await clientArgs.services.caseService.getCase({ id: caseId });
    await ensureAuthorized(clientArgs.authorization, retrievedCase, Operations.getCase);

    return await findCaseObservables(
      { caseId: retrievedCase.id, perPage, cursor, sortField, sortOrder, typeKeys, search },
      clientArgs
    );
  } catch (error) {
    throw Boom.boomify(error, {
      statusCode: Boom.isBoom(error) ? error.output.statusCode : 400,
      message: `Failed to find observables of case ${caseId}`,
    });
  }
};
