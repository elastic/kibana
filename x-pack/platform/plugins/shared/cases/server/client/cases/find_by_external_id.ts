/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type { Case } from '../../../common/types/domain';
import { CasesSchema } from '../../../common/types/domain';
import type { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject } from '../../common/utils';
import { decodeOrThrowZod } from '../../common/runtime_types';
import { buildFilter, combineFilters, NodeBuilderOperators } from '../utils';

export interface FindByExternalIdParams {
  /** The incident id recorded on the case when it was last pushed. */
  externalId: string;
  /** Narrows the match to cases pushed through this connector. */
  connectorId?: string;
}

const MAX_MATCHES = 100;

/**
 * Finds the cases whose last push targeted the given external incident. An incident id is
 * only unique within one external system, so callers that know the connector should pass it.
 */
export const findByExternalId = async (
  { externalId, connectorId }: FindByExternalIdParams,
  clientArgs: CasesClientArgs
): Promise<Case[]> => {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findCases);

    const filter = combineFilters(
      [
        buildFilter({
          filters: externalId,
          field: 'external_service.external_id',
          operator: 'or',
        }),
        authorizationFilter,
      ],
      NodeBuilderOperators.and
    );

    // The push connector is stored as a reference, not an attribute, so it cannot be filtered on.
    // The reference also matches cases that only use the connector, hence the check below.
    const found = await caseService.findCases({
      filter,
      ...(connectorId != null
        ? { hasReference: { type: ACTION_SAVED_OBJECT_TYPE, id: connectorId } }
        : {}),
      perPage: MAX_MATCHES,
      sortField: 'created_at',
    });

    ensureSavedObjectsAreAuthorized(
      found.saved_objects.map((theCase) => ({ id: theCase.id, owner: theCase.attributes.owner }))
    );

    const cases = decodeOrThrowZod(CasesSchema)(
      found.saved_objects.map((savedObject) => flattenCaseSavedObject({ savedObject }))
    );

    return connectorId != null
      ? cases.filter((theCase) => theCase.external_service?.connector_id === connectorId)
      : cases;
  } catch (error) {
    throw createCaseError({
      message: `Failed to find cases for external id ${externalId}${
        connectorId != null ? ` and connector ${connectorId}` : ''
      }: ${error}`,
      error,
      logger,
    });
  }
};
