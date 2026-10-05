/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../common/types/domain';
import { CasesRt } from '../../../common/types/domain';
import { MAX_DOCS_PER_PAGE } from '../../../common/constants';
import type { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject } from '../../common/utils';
import { decodeOrThrow } from '../../common/runtime_types';
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
        connectorId != null
          ? buildFilter({
              filters: connectorId,
              field: 'external_service.connector_id',
              operator: 'or',
            })
          : undefined,
        authorizationFilter,
      ],
      NodeBuilderOperators.and
    );

    const found = await caseService.findCases({
      filter,
      perPage: Math.min(MAX_MATCHES, MAX_DOCS_PER_PAGE),
      sortField: 'created_at',
    });

    ensureSavedObjectsAreAuthorized(
      found.saved_objects.map((theCase) => ({ id: theCase.id, owner: theCase.attributes.owner }))
    );

    return decodeOrThrow(CasesRt)(
      found.saved_objects.map((savedObject) => flattenCaseSavedObject({ savedObject }))
    );
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
