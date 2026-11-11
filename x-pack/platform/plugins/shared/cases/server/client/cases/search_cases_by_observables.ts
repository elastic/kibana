/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { toElasticsearchQuery } from '@kbn/es-query';
import type { KueryNode } from '@kbn/es-query';
import { spaceIdToNamespace } from '@kbn/spaces-plugin/server/lib/utils/namespace';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { Case } from '../../../common/types/domain';
import type { CasesTotalRelation } from '../../../common/types/api';
import {
  CASE_SAVED_OBJECT,
  MAX_CASES_BY_OBSERVABLES_CANDIDATES,
  OWNER_FIELD,
} from '../../../common/constants';
import type { SavedObjectFindOptionsKueryNode } from '../../common/types';
import type { CasesClientArgs } from '../types';
import { buildFilter, removeAttributesFromFilter } from '../utils';
import { Operations } from '../../authorization';
import type { AuthFilterHelpers } from '../../authorization/types';
import { combineFilterWithAuthorizationFilter } from '../../authorization/utils';
import type { ObservableKey } from '../../services/observables';
import { caseFieldKeysQuery } from '../../services/observables';

interface CasesByObservableKeysScope {
  owner: string;
  /** A case left out of the results, such as the case the search starts from. */
  excludeCaseId?: string;
  /** The `findCases` authorization, when the caller runs several searches with one. */
  authorizationFilter?: AuthFilterHelpers;
}

export interface SearchCasesByObservableKeysArgs extends CasesByObservableKeysScope {
  keys: ObservableKey[];
  /** Most cases the `cases-observables` side keeps; defaults to the shared cap. */
  candidateCap?: number;
  caseOptions: Pick<
    SavedObjectFindOptionsKueryNode,
    'sortField' | 'sortOrder' | 'page' | 'perPage'
  >;
}

export interface CountCasesByObservableKeysArgs extends CasesByObservableKeysScope {
  keys: ObservableKey[];
}

const requestNamespaces = (spaceId: string): string[] => [
  spaceIdToNamespace(spaceId) ?? DEFAULT_NAMESPACE_STRING,
];

/** The owner, authorization and excluded-case part of a raw query over cases. */
const casesScopeQuery = (
  owner: string,
  authorizationFilter: KueryNode | undefined,
  excludeCaseId: string | undefined
): estypes.QueryDslQueryContainer => {
  const casesFilter = combineFilterWithAuthorizationFilter(
    buildFilter({ filters: owner, field: OWNER_FIELD, operator: 'or' }),
    authorizationFilter
  );

  return {
    bool: {
      // The raw search reads `cases.<field>`, not the find-style `cases.attributes.<field>`.
      filter: casesFilter ? [toElasticsearchQuery(removeAttributesFromFilter(casesFilter))] : [],
      ...(excludeCaseId != null && {
        must_not: [{ term: { _id: `${CASE_SAVED_OBJECT}:${excludeCaseId}` } }],
      }),
    },
  };
};

/**
 * The owners the `cases-observables` side may read: the requested owner, if the user may find its
 * cases. Without security every owner is readable.
 */
const readableOwners = (owner: string, { authorizedOwners }: AuthFilterHelpers): string[] =>
  authorizedOwners == null || authorizedOwners.includes(owner) ? [owner] : [];

/**
 * Finds the cases of an owner, in the request's space and readable by the user, that hold any of
 * the observable keys in either store, as one sorted page.
 *
 * Cases match through their field, or through their `cases-observables` objects grouped by case:
 * up to the cap, the cases holding the most keys first, then those with the newest match. One case
 * search pages and sorts both together, so a case holding keys in both stores counts once. When the
 * cap cut cases off, `totalRelation` is `gte`.
 */
export const searchCasesByObservableKeys = async (
  {
    keys,
    owner,
    excludeCaseId,
    candidateCap = MAX_CASES_BY_OBSERVABLES_CANDIDATES,
    caseOptions,
    authorizationFilter: givenAuthorizationFilter,
  }: SearchCasesByObservableKeysArgs,
  clientArgs: CasesClientArgs
): Promise<{ cases: Case[]; total: number; totalRelation: CasesTotalRelation }> => {
  const {
    services: { caseService, observableService },
    authorization,
    spaceId,
  } = clientArgs;

  const authorizationFilter =
    givenAuthorizationFilter ?? (await authorization.getAuthorizationFilter(Operations.findCases));
  const owners = readableOwners(owner, authorizationFilter);

  if (keys.length === 0 || owners.length === 0) {
    return { cases: [], total: 0, totalRelation: 'eq' };
  }

  const { candidates, capped } = await observableService.findSimilarCandidates({
    excludeCaseId,
    keys,
    owners,
    size: candidateCap,
  });

  const { cases, total } = await caseService.searchCasesPage({
    namespaces: requestNamespaces(spaceId),
    query: {
      bool: {
        filter: [casesScopeQuery(owner, authorizationFilter.filter, excludeCaseId)],
        should: [
          caseFieldKeysQuery(keys),
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

  authorizationFilter.ensureSavedObjectsAreAuthorized(
    cases.map(({ id, owner: caseOwner }) => ({ id, owner: caseOwner }))
  );

  return { cases, total, totalRelation: capped ? 'gte' : 'eq' };
};

/**
 * For each observable key, how many cases of an owner, in the request's space and readable by the
 * user, hold it in either store, in key order. Two searches per 1,000 keys and no cap: each store
 * counts the cases holding each key in its own `filters` aggregation, with no case join.
 *
 * A case holds a key in one store only (the repeat check on add, the daily dedupe), so the two
 * counts add up. They run high only until the daily task removes a same-moment repeat, or until a
 * deleted case's objects are removed.
 */
export const countCasesByObservableKeys = async (
  {
    keys,
    owner,
    excludeCaseId,
    authorizationFilter: givenAuthorizationFilter,
  }: CountCasesByObservableKeysArgs,
  clientArgs: CasesClientArgs
): Promise<number[]> => {
  const {
    services: { caseService, observableService },
    authorization,
    spaceId,
  } = clientArgs;

  if (keys.length === 0) {
    return [];
  }

  const authorizationFilter =
    givenAuthorizationFilter ?? (await authorization.getAuthorizationFilter(Operations.findCases));
  const owners = readableOwners(owner, authorizationFilter);

  if (owners.length === 0) {
    return keys.map(() => 0);
  }

  const [fieldCounts, typeCounts] = await Promise.all([
    caseService.countCasesByObservableKeys({
      namespaces: requestNamespaces(spaceId),
      query: casesScopeQuery(owner, authorizationFilter.filter, excludeCaseId),
      keys,
    }),
    observableService.countCasesByKeys({ keys, owners, excludeCaseId }),
  ]);

  return keys.map((_, index) => (fieldCounts[index] ?? 0) + (typeCounts[index] ?? 0));
};
