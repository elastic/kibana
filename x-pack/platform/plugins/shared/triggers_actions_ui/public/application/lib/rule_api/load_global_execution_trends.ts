/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import datemath from '@kbn/datemath';
import type { GetGlobalExecutionTrendsResponseBody } from '@kbn/alerting-plugin/common/routes/rule/apis/global_execution_trends';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { getFilter } from './get_filter';

export interface ExecutionTrendsBucket {
  timestamp: string;
  total: number;
  success: number;
  failure: number;
  warning: number;
  unknown: number;
  avgDurationMs: number;
}

export interface ExecutionTrendsFailingRule {
  id: string;
  name: string;
  failures: number;
  lastFailure: string | null;
}

export interface ExecutionTrendsSlowRule {
  id: string;
  name: string;
  executions: number;
  avgDurationMs: number;
}

export interface ExecutionTrends {
  interval: string;
  buckets: ExecutionTrendsBucket[];
  topFailingRules: ExecutionTrendsFailingRule[];
  slowestRules: ExecutionTrendsSlowRule[];
}

export interface LoadGlobalExecutionTrendsProps {
  http: HttpSetup;
  dateStart: string;
  dateEnd?: string;
  ruleTypeIds?: string[];
  namespaces?: Array<string | undefined>;
}

/** The alerting API only accepts ISO dates, so resolve datemath expressions such as `now-24h` first. */
const toIsoDate = (date: string | undefined, roundUp: boolean): string | undefined => {
  if (!date || !date.includes('now')) {
    return date;
  }
  return datemath.parse(date, { roundUp })?.toISOString() ?? date;
};

export const rewriteGlobalExecutionTrendsResponse = ({
  interval,
  buckets,
  top_failing_rules: topFailingRules,
  slowest_rules: slowestRules,
}: GetGlobalExecutionTrendsResponseBody): ExecutionTrends => ({
  interval,
  buckets: buckets.map(({ avg_duration_ms: avgDurationMs, ...bucket }) => ({
    ...bucket,
    avgDurationMs,
  })),
  topFailingRules: topFailingRules.map(({ last_failure: lastFailure, ...rule }) => ({
    ...rule,
    lastFailure,
  })),
  slowestRules: slowestRules.map(({ avg_duration_ms: avgDurationMs, ...rule }) => ({
    ...rule,
    avgDurationMs,
  })),
});

export const loadGlobalExecutionTrends = async ({
  http,
  dateStart,
  dateEnd,
  ruleTypeIds,
  namespaces,
}: LoadGlobalExecutionTrendsProps): Promise<ExecutionTrends> => {
  const filter = getFilter({ ruleTypeIds });

  const res = await http.get<GetGlobalExecutionTrendsResponseBody>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/_global_execution_trends`,
    {
      query: {
        filter: filter.length ? filter.join(' and ') : undefined,
        date_start: toIsoDate(dateStart, false),
        date_end: toIsoDate(dateEnd, true),
        namespaces: namespaces ? JSON.stringify(namespaces) : namespaces,
      },
    }
  );
  return rewriteGlobalExecutionTrendsResponse(res);
};
