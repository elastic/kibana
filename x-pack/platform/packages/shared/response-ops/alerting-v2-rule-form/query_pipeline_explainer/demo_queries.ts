/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NoData, Query, Recovery } from '@kbn/alerting-v2-schemas';
import { noDataStrategy, recoveryStrategy } from '@kbn/alerting-v2-schemas';

/** Generic CPU demo used on Get started (not domain-mirrored). */
export const DEMO_BASE_QUERY = `FROM metrics-*
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| WHERE system.cpu.total.norm.pct IS NOT NULL
| STATS
    avg_cpu_pct = ROUND(AVG(system.cpu.total.norm.pct) * 100, 0),
    samples = COUNT(*)
  BY host.name, cloud.availability_zone
| EVAL severity = CASE(avg_cpu_pct > 95, "critical", avg_cpu_pct > 90, "high", avg_cpu_pct > 85, "medium")
| WHERE samples >= 10 AND severity IS NOT NULL
| KEEP host.name, cloud.availability_zone, avg_cpu_pct, severity, samples`;

export const DEMO_BREACH_SEGMENT = 'WHERE avg_cpu_pct > 85';

export const DEMO_RECOVERY_SEGMENT = 'WHERE avg_cpu_pct <= 85';

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
