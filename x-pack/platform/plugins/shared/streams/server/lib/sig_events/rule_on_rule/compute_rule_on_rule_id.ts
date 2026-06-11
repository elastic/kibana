/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { v5 } from 'uuid';

/**
 * Deterministic rule-on-rule id for a monitored base rule.
 * Metric-based STATS paths pass `metricName` to produce one child per metric.
 */
export function computeRuleOnRuleId(monitoredRuleId: string, metricName?: string): string {
  const hashInput = metricName
    ? (['sigevents:rule-on-rule', monitoredRuleId, metricName] as const)
    : (['sigevents:rule-on-rule', monitoredRuleId] as const);
  return v5(objectHash(hashInput), v5.DNS);
}
