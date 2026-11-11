/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Case } from '../../../common/types/domain';
import type {
  CountCasesByObservablesRequest,
  CountCasesByObservablesResponse,
  FindCasesByObservableRequest,
  FindCasesByObservableResponse,
} from '../../../common/types/api';
import {
  CountCasesByObservablesRequestSchema,
  CountCasesByObservablesResponseSchema,
  FindCasesByObservableRequestSchema,
  FindCasesByObservableResponseSchema,
} from '../../../common/types/api';
import { decodeWithExcessOrThrowZod, decodeOrThrowZod } from '../../common/runtime_types';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '../types';
import { convertSortField } from '../utils';
import { withObservablesPreview } from '../../common/observables_preview';
import {
  countCasesByObservableKeys,
  searchCasesByObservableKeys,
} from './search_cases_by_observables';
import { DEFAULT_PER_PAGE } from '../../routes/api';
import { observableKey } from './observables';

/**
 * Returns a page of the cases of an owner that hold an observable with the type key and value, in
 * either store. The match is exact, like similar cases. `perPage: 0` returns only the total, which
 * is a minimum when `total_relation` is `gte`.
 */
export const findByObservable = async (
  params: FindCasesByObservableRequest,
  clientArgs: CasesClientArgs
): Promise<FindCasesByObservableResponse> => {
  const {
    services: { licensingService, attachmentService, observableService },
    logger,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to find cases by observable, you must be subscribed to an Elastic Platinum license'
    );
  }

  try {
    const {
      owner,
      typeKey,
      value,
      excludeCaseId,
      page = 1,
      perPage = DEFAULT_PER_PAGE,
      sortField,
      sortOrder,
    } = decodeWithExcessOrThrowZod(FindCasesByObservableRequestSchema)(params);

    const { cases, total, totalRelation } = await searchCasesByObservableKeys(
      {
        keys: [{ typeKey, value }],
        owner,
        excludeCaseId,
        caseOptions: { sortField: convertSortField(sortField), sortOrder, page, perPage },
      },
      clientArgs
    );

    const [commentTotals, casesWithPreview] = await Promise.all([
      attachmentService.getter.getCaseAttatchmentStats({ caseIds: cases.map(({ id }) => id) }),
      withObservablesPreview<Case>(cases, observableService),
    ]);

    return decodeOrThrowZod(FindCasesByObservableResponseSchema)({
      cases: casesWithPreview.map((theCase) => {
        const { userComments, alerts, events } = commentTotals.get(theCase.id) ?? {
          alerts: 0,
          userComments: 0,
          events: 0,
        };
        return {
          ...theCase,
          totalComment: userComments,
          totalAlerts: alerts,
          totalEvents: events,
        };
      }),
      page,
      per_page: perPage,
      total,
      total_relation: totalRelation,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to find cases by observable: ${JSON.stringify({
        owner: params.owner,
        typeKey: params.typeKey,
      })}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * For each observable of a page, how many cases of the owner hold its exact type key and value,
 * in either store. Two searches answer the whole page, with no cap.
 */
export const countByObservables = async (
  params: CountCasesByObservablesRequest,
  clientArgs: CasesClientArgs
): Promise<CountCasesByObservablesResponse> => {
  const { services, logger } = clientArgs;

  if (!(await services.licensingService.isAtLeastPlatinum())) {
    throw Boom.forbidden(
      'In order to find cases by observable, you must be subscribed to an Elastic Platinum license'
    );
  }

  try {
    const { owner, observables, excludeCaseId } = decodeWithExcessOrThrowZod(
      CountCasesByObservablesRequestSchema
    )(params);

    const keys = [
      ...new Map(
        observables.map(({ typeKey, value }) => [
          observableKey({ typeKey, value }),
          { typeKey, value },
        ])
      ).values(),
    ];

    const totals = await countCasesByObservableKeys({ keys, owner, excludeCaseId }, clientArgs);

    return decodeOrThrowZod(CountCasesByObservablesResponseSchema)({
      counts: keys.map(({ typeKey, value }, index) => ({ typeKey, value, total: totals[index] })),
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to count cases by observables: ${JSON.stringify({
        owner: params.owner,
        observables: params.observables?.length,
      })}: ${error}`,
      error,
      logger,
    });
  }
};
