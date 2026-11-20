/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_METRIC_DATE_LENGTH, MAX_OWNER_LENGTH } from '../../../constants';
import type { KpiMetricFormat } from '../../../constants/kpi_metrics';
import { CustomKpiMetricRequestSchema } from '../configure/v1';
import { CasesSearchRequestSchema } from '../case/v1';

const KpiMetricsBaseRequestSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(MAX_OWNER_LENGTH),
    /**
     * A date or date math. The metrics count the documents after (gte) this date.
     */
    from: z.string().max(MAX_METRIC_DATE_LENGTH).optional(),
    /**
     * A date or date math. The metrics count the documents before (lte) this date.
     */
    to: z.string().max(MAX_METRIC_DATE_LENGTH).optional(),
  })
);

/**
 * The case list filters, with the same fields and bounds as the case search
 */
export const KpiMetricsCaseFiltersSchema = lazySchema(() => {
  const { shape } = CasesSearchRequestSchema;

  return z.object({
    tags: shape.tags,
    status: shape.status,
    severity: shape.severity,
    assignees: shape.assignees,
    reporters: shape.reporters,
    category: shape.category,
    search: shape.search,
    searchFields: shape.searchFields,
    customFields: shape.customFields,
    extendedFieldFilters: shape.extendedFieldFilters,
  });
});

export type KpiMetricsCaseFilters = z.infer<typeof KpiMetricsCaseFiltersSchema>;

export const KpiMetricsRequestSchema = lazySchema(() =>
  KpiMetricsBaseRequestSchema.extend({
    /**
     * The metrics count only the documents of the cases that match these filters
     */
    filters: KpiMetricsCaseFiltersSchema.optional(),
  })
);

export type KpiMetricsRequest = z.infer<typeof KpiMetricsRequestSchema>;

export const KpiMetricPreviewRequestSchema = lazySchema(() =>
  KpiMetricsBaseRequestSchema.extend({
    metric: CustomKpiMetricRequestSchema,
  })
);

export type KpiMetricPreviewRequest = z.infer<typeof KpiMetricPreviewRequestSchema>;

export interface KpiMetricValueResult {
  id: string;
  type: 'value';
  format: KpiMetricFormat;
  value: number | null;
  /**
   * The value of the period of equal length directly before the selected range
   */
  previousValue?: number | null;
}

export interface KpiMetricErrorResult {
  id: string;
  type: 'error';
  message: string;
}

export interface KpiMetricBreakdownBucket {
  key: string;
  count: number;
  /**
   * The count of the previous period. Null when the previous count is not known, because the
   * key can be in the previous "Other" count.
   */
  previousCount?: number | null;
}

export interface KpiMetricBreakdownResult {
  id: string;
  type: 'breakdown';
  field: string;
  /**
   * The count of all matching documents
   */
  total: number;
  /**
   * In the order of Elasticsearch: the count first, then the key
   */
  buckets: KpiMetricBreakdownBucket[];
  /**
   * The count of the documents with a value that is not in the buckets
   */
  otherCount: number;
  /**
   * The count of the documents with no value in the field
   */
  missingCount: number;
}

export type KpiMetricResult =
  | KpiMetricValueResult
  | KpiMetricBreakdownResult
  | KpiMetricErrorResult;

export type KpiMetricPreviewResponse = KpiMetricResult;

export interface KpiMetricsResponse {
  /**
   * False when Case Analytics v2 is disabled. The analytics metrics then do not show.
   */
  enabled: boolean;
  metrics: KpiMetricResult[];
}
