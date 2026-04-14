/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeverityThreshold } from '../../../../common/types/anomalies';

/**
 * Normalizes table severity props from SMV page vs embeddable vs dashboard wrapper
 * into the array shape expected by getAnomaliesTableData (SeverityThreshold[]).
 */
export function normalizeSeverityThresholdForApi(tableSeverity: unknown): SeverityThreshold[] {
  if (Array.isArray(tableSeverity)) {
    return tableSeverity as SeverityThreshold[];
  }
  if (
    tableSeverity !== null &&
    typeof tableSeverity === 'object' &&
    'val' in tableSeverity &&
    Array.isArray((tableSeverity as { val: unknown }).val)
  ) {
    return (tableSeverity as { val: SeverityThreshold[] }).val;
  }
  if (typeof tableSeverity === 'number') {
    return [{ min: tableSeverity }] as SeverityThreshold[];
  }
  return [{ min: 0 }] as SeverityThreshold[];
}
