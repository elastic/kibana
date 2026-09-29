/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Whether a detector function accepts a `field_name` and, if so, what kind of
 * ES|QL output column it accepts:
 *  - 'none': event-rate style functions (count family, rare family) — no
 *    field_name. `rare`/`freq_rare` are event-rate w.r.t. `by_field_name`,
 *    which must be set (see `requiresByField` below) — enforced by the
 *    detectors editor's by-field selector.
 *  - 'numeric': metric-style functions — field_name must be a numeric ES|QL
 *    output column.
 *  - 'any': `distinct_count` — field_name can be any output column.
 */
export type EsqlDetectorFieldRequirement = 'none' | 'numeric' | 'any';

export interface EsqlDetectorFunctionOption {
  value: string;
  label: string;
  fieldRequirement: EsqlDetectorFieldRequirement;
}

export const ESQL_DETECTOR_FUNCTIONS: EsqlDetectorFunctionOption[] = [
  { value: 'count', label: 'count', fieldRequirement: 'none' },
  { value: 'high_count', label: 'high_count', fieldRequirement: 'none' },
  { value: 'low_count', label: 'low_count', fieldRequirement: 'none' },
  { value: 'mean', label: 'mean', fieldRequirement: 'numeric' },
  { value: 'high_mean', label: 'high_mean', fieldRequirement: 'numeric' },
  { value: 'low_mean', label: 'low_mean', fieldRequirement: 'numeric' },
  { value: 'sum', label: 'sum', fieldRequirement: 'numeric' },
  { value: 'high_sum', label: 'high_sum', fieldRequirement: 'numeric' },
  { value: 'low_sum', label: 'low_sum', fieldRequirement: 'numeric' },
  { value: 'median', label: 'median', fieldRequirement: 'numeric' },
  { value: 'min', label: 'min', fieldRequirement: 'numeric' },
  { value: 'max', label: 'max', fieldRequirement: 'numeric' },
  { value: 'metric', label: 'metric', fieldRequirement: 'numeric' },
  { value: 'non_zero_count', label: 'non_zero_count', fieldRequirement: 'none' },
  { value: 'distinct_count', label: 'distinct_count', fieldRequirement: 'any' },
  { value: 'rare', label: 'rare', fieldRequirement: 'none' },
  { value: 'freq_rare', label: 'freq_rare', fieldRequirement: 'none' },
];

export const DEFAULT_DETECTOR_FUNCTION = 'mean';

export const detectorFunctionByValue = (value: string): EsqlDetectorFunctionOption | undefined =>
  ESQL_DETECTOR_FUNCTIONS.find((option) => option.value === value);

export const detectorFieldRequirement = (functionName: string): EsqlDetectorFieldRequirement =>
  detectorFunctionByValue(functionName)?.fieldRequirement ?? 'numeric';

/**
 * `rare`/`freq_rare` are meaningless without a `by_field_name` (they detect
 * rare *values of the by field*, not a rare event rate overall) — ES itself
 * rejects them at PUT time without one. Enforced client-side here so the
 * staged wizard's PICK_FIELDS step (g2sz.10) can block Next before the
 * server round-trip.
 */
export const REQUIRES_BY_FIELD_FUNCTIONS = new Set(['rare', 'freq_rare']);

export const requiresByField = (functionName: string): boolean =>
  REQUIRES_BY_FIELD_FUNCTIONS.has(functionName);

export const detectorFunctionSelectOptions = ESQL_DETECTOR_FUNCTIONS.map(({ value, label }) => ({
  value,
  text: label,
}));

/** Human-readable "function(field)" summary shown next to each detector row. */
export const describeDetector = ({
  functionName,
  field,
}: {
  functionName: string;
  field?: string;
}): string => {
  if (detectorFieldRequirement(functionName) === 'none' || !field) {
    return i18n.translate('xpack.ml.esqlJob.query.detectorSummaryNoField', {
      defaultMessage: '{functionName}()',
      values: { functionName },
    });
  }

  return i18n.translate('xpack.ml.esqlJob.query.detectorSummaryWithField', {
    defaultMessage: '{functionName}({field})',
    values: { functionName, field },
  });
};
