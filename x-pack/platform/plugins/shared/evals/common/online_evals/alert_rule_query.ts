/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvaluationIndices } from '@kbn/evals-common';

/**
 * Which side of the threshold is a regression:
 * - `below`: the average score dropped under the threshold (higher-is-better metrics).
 * - `above`: the average score rose over the threshold (lower-is-better metrics).
 */
export type OnlineEvalAlertTrigger = 'below' | 'above';

export type OnlineEvalTimeWindowUnit = 's' | 'm' | 'h' | 'd';

export interface OnlineEvalAlertRuleOptions {
  monitorId: string;
  spaceId: string;
  /** `score.name` of the metric to watch. */
  metric: string;
  threshold: number;
  trigger: OnlineEvalAlertTrigger;
  /** Minimum number of scores in the rule's time window before the rule may fire. */
  minSampleSize: number;
  windowSize: number;
  windowUnit: OnlineEvalTimeWindowUnit;
}

export const ONLINE_EVAL_ALERT_TIME_FIELD = '@timestamp';

/** Escapes a value for use inside a double-quoted ES|QL string literal. */
export const escapeEsqlString = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');

/**
 * Resolves the trigger side from a score's direction. `maximize` (the default for scores that
 * declare none) regresses downwards, `minimize` regresses upwards. `neutral` scores have no
 * improvement direction, so the caller must pick the side explicitly.
 */
export const getDefaultAlertTrigger = (
  direction: 'maximize' | 'minimize' | 'neutral' | undefined
): OnlineEvalAlertTrigger => (direction === 'minimize' ? 'above' : 'below');

/**
 * The `.es-query` ES|QL rule fires when the query returns at least one row, and applies its own
 * `@timestamp` range filter for the rule window, so the query only needs to return a row when the
 * windowed average has regressed and enough scores back it up.
 */
export const buildOnlineEvalAlertEsql = ({
  monitorId,
  spaceId,
  metric,
  threshold,
  trigger,
  minSampleSize,
  drillDownUrl,
}: Pick<
  OnlineEvalAlertRuleOptions,
  'monitorId' | 'spaceId' | 'metric' | 'threshold' | 'trigger' | 'minSampleSize'
> & {
  /** When set, returned as a `drill_down_url` column so it lands in the alert context. */
  drillDownUrl?: string;
}): string => {
  const comparator = trigger === 'below' ? '<' : '>';
  return [
    `FROM ${EvaluationIndices.ONLINE_SCORES}`,
    `| WHERE monitor.id == "${escapeEsqlString(monitorId)}" AND space_ids == "${escapeEsqlString(
      spaceId
    )}" AND score.name == "${escapeEsqlString(metric)}"`,
    '| STATS avg_score = AVG(score.value), n = COUNT(*)',
    `| WHERE n >= ${Math.max(
      1,
      Math.floor(minSampleSize)
    )} AND avg_score ${comparator} ${threshold}`,
    ...(drillDownUrl ? [`| EVAL drill_down_url = "${escapeEsqlString(drillDownUrl)}"`] : []),
  ].join('\n');
};

/** Params for a stock `.es-query` rule running in ES|QL mode. */
export const buildOnlineEvalAlertRuleParams = (
  options: OnlineEvalAlertRuleOptions & { drillDownUrl?: string }
) => ({
  searchType: 'esqlQuery' as const,
  esqlQuery: { esql: buildOnlineEvalAlertEsql(options) },
  timeField: ONLINE_EVAL_ALERT_TIME_FIELD,
  timeWindowSize: options.windowSize,
  timeWindowUnit: options.windowUnit,
  // ES|QL rules fire when the row count is above zero.
  threshold: [0],
  thresholdComparator: '>' as const,
  size: 0,
  excludeHitsFromPreviousRun: false,
  aggType: 'count',
  groupBy: 'all',
});

/**
 * Absolute-or-relative path of the detail page, narrowed to the rule's window and metric, so a
 * fired alert drills down to the scores (and `trace_id`s) that moved the average.
 */
export const buildOnlineEvalAlertDrillDownPath = ({
  workflowId,
  metric,
  windowSize,
  windowUnit,
}: Pick<OnlineEvalAlertRuleOptions, 'metric' | 'windowSize' | 'windowUnit'> & {
  workflowId: string;
}): string => {
  const params = new URLSearchParams({
    from: `now-${windowSize}${windowUnit}`,
    to: 'now',
    metric,
  });
  return `/online/${encodeURIComponent(workflowId)}?${params.toString()}`;
};
