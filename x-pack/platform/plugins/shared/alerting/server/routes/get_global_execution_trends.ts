/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { IExecutionTrendsResult } from '../../common';
import type {
  GetGlobalExecutionTrendsQueryV1,
  GetGlobalExecutionTrendsResponseBodyV1,
  GetGlobalExecutionTrendsResponseV1,
} from '../../common/routes/rule/apis/global_execution_trends';
import { getGlobalExecutionTrendsQuerySchemaV1 } from '../../common/routes/rule/apis/global_execution_trends';
import type { AlertingRequestHandlerContext } from '../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { verifyAccessAndContext, rewriteNamespaces } from './lib';
import type { GetGlobalExecutionTrendsParams } from '../rules_client';
import type { ILicenseState } from '../lib';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from './constants';

const rewriteReq = ({
  date_start: dateStart,
  date_end: dateEnd,
  namespaces,
  filter,
}: GetGlobalExecutionTrendsQueryV1): GetGlobalExecutionTrendsParams => ({
  dateStart,
  dateEnd,
  filter,
  namespaces: rewriteNamespaces(namespaces),
});

export const transformGlobalExecutionTrendsResponse = ({
  interval,
  buckets,
  topFailingRules,
  slowestRules,
}: IExecutionTrendsResult): GetGlobalExecutionTrendsResponseBodyV1 => ({
  interval,
  buckets: buckets.map(({ avgDurationMs, ...bucket }) => ({
    ...bucket,
    avg_duration_ms: avgDurationMs,
  })),
  top_failing_rules: topFailingRules.map(({ lastFailure, ...rule }) => ({
    ...rule,
    last_failure: lastFailure,
  })),
  slowest_rules: slowestRules.map(({ avgDurationMs, ...rule }) => ({
    ...rule,
    avg_duration_ms: avgDurationMs,
  })),
});

export const getGlobalExecutionTrendsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/_global_execution_trends`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
      },
      validate: {
        query: getGlobalExecutionTrendsQuerySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const result = await rulesClient.getGlobalExecutionTrendsWithAuth(rewriteReq(req.query));
        const response: GetGlobalExecutionTrendsResponseV1 = {
          body: transformGlobalExecutionTrendsResponse(result),
        };
        return res.ok(response);
      })
    )
  );
};
