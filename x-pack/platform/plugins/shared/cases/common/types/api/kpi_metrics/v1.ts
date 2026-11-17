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

export const KpiMetricsRequestSchema = lazySchema(() =>
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

export type KpiMetricsRequest = z.infer<typeof KpiMetricsRequestSchema>;

export const KpiMetricPreviewRequestSchema = lazySchema(() =>
  KpiMetricsRequestSchema.extend({
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

export type KpiMetricResult = KpiMetricValueResult | KpiMetricErrorResult;

export type KpiMetricPreviewResponse = KpiMetricResult;

export interface KpiMetricsResponse {
  /**
   * False when Case Analytics v2 is disabled. The analytics metrics then do not show.
   */
  enabled: boolean;
  metrics: KpiMetricResult[];
}
