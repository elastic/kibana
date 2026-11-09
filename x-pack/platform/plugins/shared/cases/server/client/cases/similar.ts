/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { estypes } from '@elastic/elasticsearch';
import { toElasticsearchQuery } from '@kbn/es-query';
import { spaceIdToNamespace } from '@kbn/spaces-plugin/server/lib/utils/namespace';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { ObservableType } from '../../../common/types/domain/observable/v1';
import type { Case, Observable } from '../../../common/types/domain';
import {
  CASE_SAVED_OBJECT,
  MAX_OBSERVABLES_PER_CASE,
  OWNER_FIELD,
} from '../../../common/constants';
import type { CasesSimilarResponse, SimilarCasesSearchRequest } from '../../../common/types/api';
import {
  SimilarCasesSearchRequestSchema,
  CasesSimilarResponseSchema,
} from '../../../common/types/api';
import { decodeWithExcessOrThrowZod, decodeOrThrowZod } from '../../common/runtime_types';

import { createCaseError } from '../../common/error';
import type { CasesClient, CasesClientArgs } from '..';
import { convertSortField, buildFilter } from '../utils';
import { Operations } from '../../authorization';
import { combineFilterWithAuthorizationFilter } from '../../authorization/utils';
import { getAvailableObservableTypesMap } from '../observable_types';
import { withObservablesPreview } from '../../common/observables_preview';
import type { ObservableKey } from '../../services/observables';
import { groupValuesByTypeKey } from '../../services/observables';
import { observableKey } from './observables';
import { DEFAULT_PER_PAGE } from '../../routes/api';

/** Most candidate cases the `cases-observables` side of a similar search keeps, most shared first. */
export const MAX_SIMILAR_CANDIDATE_CASES = 1_000;

interface Similarity {
  typeKey: string;
  value: string;
  typeLabel?: string;
}

const uniqueKeys = (observables: ObservableKey[]): ObservableKey[] => {
  const seen = new Map<string, ObservableKey>();
  for (const { typeKey, value } of observables) {
    seen.set(observableKey({ typeKey, value }), { typeKey, value });
  }
  return [...seen.values()];
};

/** One nested clause per type key with its values as a set, over other cases' fields. */
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

const toSimilarities = (
  observables: Array<Pick<Observable, 'typeKey' | 'value'>>,
  availableObservableTypes: Map<string, ObservableType>
): Similarity[] =>
  uniqueKeys(observables)
    .filter(({ typeKey }) => availableObservableTypes.has(typeKey))
    .map(({ typeKey, value }) => ({
      typeKey,
      value,
      typeLabel: availableObservableTypes.get(typeKey)?.label,
    }));

/**
 * Retrieves the cases that share at least one observable with a case, in either store.
 *
 * The source case's observables come from its field and its `cases-observables` objects (up to
 * 10,000). Other cases match through their field, with one clause per type key, or through their
 * objects of the type, grouped by case and capped at the cases sharing the most. One case search
 * pages and sorts both together, as before. Each similar case lists up to 50 shared observables
 * and how many it shares in all.
 */
export const similar = async (
  caseId: string,
  params: SimilarCasesSearchRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<CasesSimilarResponse> => {
  const {
    services: { caseService, licensingService, attachmentService, observableService },
    logger,
    authorization,
    spaceId,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to use the similar cases feature, you must be subscribed to an Elastic Platinum license'
    );
  }

  try {
    const paramArgs = decodeWithExcessOrThrowZod(SimilarCasesSearchRequestSchema)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });
    const { owner } = retrievedCase.attributes;

    const [availableObservableTypesMap, typeObservables] = await Promise.all([
      getAvailableObservableTypesMap(casesClient, owner),
      observableService.getAllForCase(caseId),
    ]);

    // NOTE: skip non-existent observable types
    const sourceKeys = uniqueKeys([
      ...(retrievedCase.attributes.observables ?? []),
      ...typeObservables,
    ]).filter(({ typeKey }) => availableObservableTypesMap.has(typeKey));

    // NOTE: a case without observables has no similar cases.
    if (sourceKeys.length === 0) {
      return {
        cases: [],
        page: 1,
        per_page: paramArgs.perPage ?? 0,
        total: 0,
      };
    }

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findCases);

    const candidates = await observableService.findSimilarCandidates({
      excludeCaseId: caseId,
      keys: sourceKeys,
      owners: [owner],
      size: MAX_SIMILAR_CANDIDATE_CASES,
    });

    const casesFilter = combineFilterWithAuthorizationFilter(
      buildFilter({ filters: owner, field: OWNER_FIELD, operator: 'or' }),
      authorizationFilter
    );

    const { cases, total } = await caseService.searchCasesPage({
      namespaces: [spaceIdToNamespace(spaceId) ?? DEFAULT_NAMESPACE_STRING],
      query: {
        bool: {
          filter: casesFilter ? [toElasticsearchQuery(casesFilter)] : [],
          must_not: [{ term: { _id: `${CASE_SAVED_OBJECT}:${caseId}` } }],
          should: [
            ...fieldMatchClauses(sourceKeys),
            ...(candidates.length > 0
              ? [
                  {
                    terms: {
                      _id: candidates.map(({ caseId: id }) => `${CASE_SAVED_OBJECT}:${id}`),
                    },
                  },
                ]
              : []),
          ],
          minimum_should_match: 1,
        },
      },
      caseOptions: {
        sortField: convertSortField(paramArgs.sortField),
        sortOrder: paramArgs.sortOrder,
        page: paramArgs.page,
        perPage: paramArgs.perPage,
      },
    });

    ensureSavedObjectsAreAuthorized(
      cases.map(({ id, owner: caseOwner }) => ({ id, owner: caseOwner }))
    );

    const caseIds = cases.map(({ id }) => id);
    const sourceKeySet = new Set(sourceKeys.map(observableKey));

    const [commentTotals, sharedInType, casesWithPreview] = await Promise.all([
      attachmentService.getter.getCaseAttatchmentStats({ caseIds }),
      observableService.getSharedForCases({
        caseIds,
        keys: sourceKeys,
        size: MAX_OBSERVABLES_PER_CASE,
      }),
      withObservablesPreview<Case>(cases, observableService),
    ]);

    const res = {
      cases: casesWithPreview.map((theCase, index) => {
        const { userComments, alerts, events } = commentTotals.get(theCase.id) ?? {
          alerts: 0,
          userComments: 0,
          events: 0,
        };
        const sharedInField = (cases[index].observables ?? []).filter((observable) =>
          sourceKeySet.has(observableKey(observable))
        );
        const shared = sharedInType.get(theCase.id);
        const similarities = toSimilarities(
          [...sharedInField, ...(shared?.observables ?? [])],
          availableObservableTypesMap
        );

        return {
          ...theCase,
          totalComment: userComments,
          totalAlerts: alerts,
          totalEvents: events,
          similarities: {
            observables: similarities.slice(0, MAX_OBSERVABLES_PER_CASE),
            total_observables: Math.max(
              similarities.length,
              sharedInField.length + (shared?.total ?? 0)
            ),
          },
        };
      }),
      page: paramArgs.page ?? 1,
      per_page: paramArgs.perPage ?? DEFAULT_PER_PAGE,
      total,
    };

    return decodeOrThrowZod(CasesSimilarResponseSchema)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to find cases: ${JSON.stringify(params)}: ${error}`,
      error,
      logger,
    });
  }
};
