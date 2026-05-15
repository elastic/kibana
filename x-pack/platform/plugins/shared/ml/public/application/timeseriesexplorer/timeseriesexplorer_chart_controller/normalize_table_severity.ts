/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';

/**
 * Normalizes `tableSeverity` from SMV page vs embeddable vs dashboard into `SeverityThreshold[]`
 * for `getAnomaliesTableData`.
 *
 * - **Array** — already API-shaped; returned by reference.
 * - **Number** — legacy single minimum → `[{ min: n }]`.
 * - **`{ val: SeverityThreshold[] }`** — publishing / app-state wrapper (must be a non-null array).
 * - **Anything else** — `[{ min: 0 }]`.
 */
export function normalizeSeverityThresholdForApi(tableSeverity: unknown): SeverityThreshold[] {
  if (Array.isArray(tableSeverity)) {
    return tableSeverity as SeverityThreshold[];
  }

  if (typeof tableSeverity === 'number') {
    return [{ min: tableSeverity }] as SeverityThreshold[];
  }

  if (tableSeverity !== null && typeof tableSeverity === 'object' && 'val' in tableSeverity) {
    const val = (tableSeverity as { val: unknown }).val;
    if (Array.isArray(val)) {
      return val as SeverityThreshold[];
    }
  }

  return [{ min: 0 }] as SeverityThreshold[];
}
