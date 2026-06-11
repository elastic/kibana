/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_ON_RULE_BUCKET_INTERVAL } from './constants';

export function buildCountBasedRuleOnRuleEsql(monitoredRuleId: string): string {
  return `FROM .rule-events
| WHERE rule.id == "${monitoredRuleId}" AND type == "signal" AND status == "breached"
| STATS count = COUNT_DISTINCT(group_hash) BY bucket = BUCKET(@timestamp, ${RULE_ON_RULE_BUCKET_INTERVAL})
| CHANGE_POINT count ON bucket
| WHERE type IS NOT NULL`;
}

export function buildMetricBasedRuleOnRuleEsql(
  monitoredRuleId: string,
  metricName: string,
  bucketColumnName: string
): string {
  return `FROM .rule-events
| WHERE rule.id == "${monitoredRuleId}"
| EVAL metric_value = TO_DOUBLE(FIELD_EXTRACT(data, "${metricName}")), bucket = FIELD_EXTRACT(data, "${bucketColumnName}")
| CHANGE_POINT metric_value ON bucket
| WHERE type IS NOT NULL`;
}

/** Reference templates injected into the LLM planner prompt. */
export const RULE_ON_RULE_REFERENCE_TEMPLATES = {
  countBased: buildCountBasedRuleOnRuleEsql('<monitored_rule_id>'),
  metricBased: buildMetricBasedRuleOnRuleEsql(
    '<monitored_rule_id>',
    '<metric_name>',
    '<bucket_column_name>'
  ),
} as const;
