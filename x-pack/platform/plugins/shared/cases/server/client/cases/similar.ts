/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ObservableType } from '../../../common/types/domain/observable/v1';
import type { Case, Observable } from '../../../common/types/domain';
import {
  MAX_OBSERVABLES_PER_CASE,
  MAX_SIMILAR_OBSERVABLE_CASES,
  MAX_SIMILAR_SOURCE_OBSERVABLES,
} from '../../../common/constants';
import type { CasesSimilarResponse, SimilarCasesSearchRequest } from '../../../common/types/api';
import {
  SimilarCasesSearchRequestSchema,
  CasesSimilarResponseSchema,
} from '../../../common/types/api';
import { decodeWithExcessOrThrowZod, decodeOrThrowZod } from '../../common/runtime_types';

import { createCaseError } from '../../common/error';
import type { CasesClient, CasesClientArgs } from '..';
import { convertSortField } from '../utils';
import { getAvailableObservableTypesMap } from '../observable_types';
import { withObservablesPreview } from '../../common/observables_preview';
import type { ObservableKey } from '../../services/observables';
import { Operations } from '../../authorization';
import { observableKey } from './observables';
import {
  countCasesByObservableKeys,
  searchCasesByObservableKeys,
} from './search_cases_by_observables';
import { DEFAULT_PER_PAGE } from '../../routes/api';

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
 * Picks the source observables similar cases matches on, from how many other cases hold each. It
 * drops those no other case holds (they match nothing) and those more than
 * `MAX_SIMILAR_OBSERVABLE_CASES` cases hold (common values that carry no signal), then keeps the
 * ones the fewest cases hold, up to `MAX_SIMILAR_SOURCE_OBSERVABLES`.
 */
export const selectSimilarKeys = (
  keys: ObservableKey[],
  counts: number[]
): { matchKeys: ObservableKey[]; skippedCommon: number } => {
  const held = keys
    .map((key, index) => ({ key, count: counts[index] ?? 0 }))
    .filter(({ count }) => count > 0);
  const rare = held.filter(({ count }) => count <= MAX_SIMILAR_OBSERVABLE_CASES);

  return {
    matchKeys: rare
      .sort((a, b) => a.count - b.count)
      .slice(0, MAX_SIMILAR_SOURCE_OBSERVABLES)
      .map(({ key }) => key),
    skippedCommon: held.length - rare.length,
  };
};

/**
 * Retrieves the cases that share at least one observable with a case, in either store.
 *
 * The source case's observables come from its field and its `cases-observables` objects (up to
 * 10,000). Each is counted first, in two searches per 1,000, and only the rarer ones are matched
 * (see `selectSimilarKeys`). Other cases match through their field or their objects of the type;
 * one case search pages and sorts both together, as before. Each similar case lists up to 50
 * shared observables and how many it shares in all.
 */
export const similar = async (
  caseId: string,
  params: SimilarCasesSearchRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<CasesSimilarResponse> => {
  const {
    services: { caseService, licensingService, attachmentService, observableService },
    authorization,
    logger,
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

    const [availableObservableTypesMap, typeKeys] = await Promise.all([
      getAvailableObservableTypesMap(casesClient, owner),
      observableService.getKeysForCase(caseId),
    ]);

    // NOTE: skip non-existent observable types
    const sourceKeys = uniqueKeys([
      ...(retrievedCase.attributes.observables ?? []),
      ...typeKeys,
    ]).filter(({ typeKey }) => availableObservableTypesMap.has(typeKey));

    const noSimilarCases = (skippedCommon: number): CasesSimilarResponse => ({
      cases: [],
      page: paramArgs.page ?? 1,
      per_page: paramArgs.perPage ?? 0,
      total: 0,
      total_relation: 'eq',
      skipped_common_observables: skippedCommon,
    });

    // NOTE: a case without observables has no similar cases.
    if (sourceKeys.length === 0) {
      return noSimilarCases(0);
    }

    const authorizationFilter = await authorization.getAuthorizationFilter(Operations.findCases);
    const counts = await countCasesByObservableKeys(
      { keys: sourceKeys, owner, excludeCaseId: caseId, authorizationFilter },
      clientArgs
    );
    const { matchKeys, skippedCommon } = selectSimilarKeys(sourceKeys, counts);

    if (matchKeys.length === 0) {
      return noSimilarCases(skippedCommon);
    }

    const { cases, total, totalRelation } = await searchCasesByObservableKeys(
      {
        keys: matchKeys,
        owner,
        excludeCaseId: caseId,
        authorizationFilter,
        caseOptions: {
          sortField: convertSortField(paramArgs.sortField),
          sortOrder: paramArgs.sortOrder,
          page: paramArgs.page,
          perPage: paramArgs.perPage,
        },
      },
      clientArgs
    );

    const caseIds = cases.map(({ id }) => id);
    const sourceKeySet = new Set(sourceKeys.map(observableKey));

    // Every observable a similar case shares is listed, including common ones it was not matched on.
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
      total_relation: totalRelation,
      skipped_common_observables: skippedCommon,
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
