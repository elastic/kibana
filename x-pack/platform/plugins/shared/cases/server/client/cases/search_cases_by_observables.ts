/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { toElasticsearchQuery } from '@kbn/es-query';
import { spaceIdToNamespace } from '@kbn/spaces-plugin/server/lib/utils/namespace';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { Case } from '../../../common/types/domain';
import { CASE_SAVED_OBJECT, OWNER_FIELD } from '../../../common/constants';
import type { SavedObjectFindOptionsKueryNode } from '../../common/types';
import type { CasesClientArgs } from '../types';
import { buildFilter, removeAttributesFromFilter } from '../utils';
import { Operations } from '../../authorization';
import type { AuthFilterHelpers } from '../../authorization/types';
import { combineFilterWithAuthorizationFilter } from '../../authorization/utils';
import type { ObservableKey } from '../../services/observables';
import { groupValuesByTypeKey } from '../../services/observables';

/** One nested clause per type key with its values as a set, over the cases' fields. */
const fieldMatchClauses = (keys: ObservableKey[]): estypes.QueryDslQueryContainer[] =>
  [...groupValuesByTypeKey(keys)].map(([typeKey, values]) => ({
    nested: {
      path: `${CASE_SAVED_OBJECT}.observables`,
      query: {
        bool: {
          filter: [
            { term: { [`${CASE_SAVED_OBJECT}.observables.typeKey`]: typeKey } },
            { terms: { [`${CASE_SAVED_OBJECT}.observables.value`]: values } },
          ],
        },
      },
    },
  }));

export interface SearchCasesByObservableKeysArgs {
  keys: ObservableKey[];
  owner: string;
  /** A case left out of the results, such as the case the search starts from. */
  excludeCaseId?: string;
  /** Most cases the `cases-observables` side keeps, the ones holding the most keys first. */
  candidateCap: number;
  caseOptions: Pick<
    SavedObjectFindOptionsKueryNode,
    'sortField' | 'sortOrder' | 'page' | 'perPage'
  >;
  /** The `findCases` authorization filter, when the caller runs several searches with one. */
  authorizationFilter?: AuthFilterHelpers;
}

/**
 * Finds the cases of an owner, in the request's space and readable by the user, that hold any of
 * the observable keys in either store, as one sorted page.
 *
 * Cases match through their field, with one clause per type key, or through their
 * `cases-observables` objects, grouped by case and capped. One case search pages and sorts both
 * together, so a case holding a key in both stores counts once.
 */
export const searchCasesByObservableKeys = async (
  {
    keys,
    owner,
    excludeCaseId,
    candidateCap,
    caseOptions,
    authorizationFilter: givenAuthorizationFilter,
  }: SearchCasesByObservableKeysArgs,
  clientArgs: CasesClientArgs
): Promise<{ cases: Case[]; total: number }> => {
  const {
    services: { caseService, observableService },
    authorization,
    spaceId,
  } = clientArgs;

  const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
    givenAuthorizationFilter ?? (await authorization.getAuthorizationFilter(Operations.findCases));

  const candidates = await observableService.findSimilarCandidates({
    excludeCaseId,
    keys,
    owners: [owner],
    size: candidateCap,
  });

  const casesFilter = combineFilterWithAuthorizationFilter(
    buildFilter({ filters: owner, field: OWNER_FIELD, operator: 'or' }),
    authorizationFilter
  );

  const { cases, total } = await caseService.searchCasesPage({
    namespaces: [spaceIdToNamespace(spaceId) ?? DEFAULT_NAMESPACE_STRING],
    query: {
      bool: {
        // The raw search reads `cases.<field>`, not the find-style `cases.attributes.<field>`.
        filter: casesFilter ? [toElasticsearchQuery(removeAttributesFromFilter(casesFilter))] : [],
        ...(excludeCaseId != null && {
          must_not: [{ term: { _id: `${CASE_SAVED_OBJECT}:${excludeCaseId}` } }],
        }),
        should: [
          ...fieldMatchClauses(keys),
          ...(candidates.length > 0
            ? [
                {
                  terms: {
                    _id: candidates.map(({ caseId }) => `${CASE_SAVED_OBJECT}:${caseId}`),
                  },
                },
              ]
            : []),
        ],
        minimum_should_match: 1,
      },
    },
    caseOptions,
  });

  ensureSavedObjectsAreAuthorized(
    cases.map(({ id, owner: caseOwner }) => ({ id, owner: caseOwner }))
  );

  return { cases, total };
};
