/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NoData, Query, Recovery } from '@kbn/alerting-v2-schemas';
import { noDataStrategy, recoveryStrategy } from '@kbn/alerting-v2-schemas';

/**
 * Generic CPU demo for Get started.
 * Kept intentionally short while still showing what Universal adds over a single
 * Classic ES|QL rule query: schedule window params, grouping, severity on the
 * row, explicit returned fields, plus separate alert/recovery condition segments.
 */
export const DEMO_BASE_QUERY = `FROM metrics-*
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS avg_cpu_pct = AVG(system.cpu.total.norm.pct) * 100 BY host.name
| EVAL severity = CASE(avg_cpu_pct > 95, "critical", avg_cpu_pct > 85, "high")
| KEEP host.name, avg_cpu_pct, severity`;

export const DEMO_BREACH_SEGMENT = 'WHERE avg_cpu_pct > 85';

export const DEMO_RECOVERY_SEGMENT = 'WHERE avg_cpu_pct <= 85';

/** Severity + KEEP — the part of the base query that shapes the alert document. */
export const DEMO_SHAPE_HIGHLIGHT_SEGMENT = `EVAL severity = CASE(avg_cpu_pct > 95, "critical", avg_cpu_pct > 85, "high")
| KEEP host.name, avg_cpu_pct, severity`;

export const DEMO_QUERY: Query = {
  base: DEMO_BASE_QUERY,
  breach: { segment: DEMO_BREACH_SEGMENT },
};

export const DEMO_RECOVERY: Recovery = {
  strategy: recoveryStrategy.condition,
  segment: DEMO_RECOVERY_SEGMENT,
};

export const DEMO_NO_DATA: NoData = {
  strategy: noDataStrategy.keep_last,
};
