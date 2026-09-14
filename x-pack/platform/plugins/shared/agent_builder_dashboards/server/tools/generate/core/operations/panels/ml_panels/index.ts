/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema, timeRangeSchema } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { definePanelType, type ConfigEditValidation } from '../panel_type';

/**
 * ML anomaly detection panel logic.
 *
 * Three panel types are supported: anomaly charts (`ml_anomaly_charts`),
 * anomaly swim lane (`ml_anomaly_swimlane`), and single metric viewer
 * (`ml_single_metric_viewer`). All use `source: 'config'` — the agent supplies
 * the embeddable state directly. There is no `source: 'request'` resolver for
 * ML panels; the agent derives job IDs and parameters from prior tool calls or
 * conversation context.
 *
 * All schemas are defined inline with Zod v4 to avoid mixing Zod v3 schemas
 * from `@kbn/ml-server-schemas` with the v4 `z` instance used by this package.
 */

const panelTitleSchema = z.string().max(500).optional().describe('Descriptive panel title.');

const panelIdSchema = z.string().max(256);

const validateSameEmbeddableType =
  (embeddableType: string, kind: string) =>
  (existingPanel: { id: string; type: string }): ConfigEditValidation =>
    existingPanel.type === embeddableType
      ? { ok: true }
      : {
          ok: false,
          error: `Panel "${existingPanel.id}" with type "${existingPanel.type}" cannot be edited as ${kind}.`,
        };

// ─── Anomaly Charts ───────────────────────────────────────────────────────────

export const anomalyChartsPanelConfigSchema = z.object({
  job_ids: z
    .array(z.string().max(256))
    .min(1)
    .max(20)
    .describe('Anomaly detection job or group IDs to display. Must already exist.'),
  title: panelTitleSchema,
  time_range: timeRangeSchema
    .optional()
    .describe('Time range to scope the chart. When omitted the dashboard time range is used.'),
  severity_threshold: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Minimum anomaly score (0–100) to display. Defaults to 25 when omitted.'),
});

export const anomalyChartsPanelConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('ml_anomaly_charts'),
  grid: panelGridSchema,
  config: anomalyChartsPanelConfigSchema.describe(
    'Anomaly charts panel configuration. Provide job_ids obtained from prior ML tool results or conversation context.'
  ),
});

export const editAnomalyChartsPanelConfigInputSchema = anomalyChartsPanelConfigInputSchema
  .omit({ grid: true })
  .extend({
    panelId: panelIdSchema.describe('Existing anomaly charts panel id to update.'),
    config: anomalyChartsPanelConfigSchema.describe(
      'New anomaly charts configuration. Fully replaces the existing config.'
    ),
  });

export const anomalyChartsPanelDefinition = definePanelType({
  embeddableType: 'ml_anomaly_charts',
  buildPanelContent: (config) => {
    const { severity_threshold: severityThreshold, ...rest } = config;
    return {
      type: 'ml_anomaly_charts',
      config: {
        ...rest,
        ...(typeof severityThreshold === 'number'
          ? { severity_threshold: [{ min: severityThreshold }] }
          : {}),
      },
    };
  },
  validateConfigEdit: validateSameEmbeddableType('ml_anomaly_charts', 'anomaly charts'),
});

// ─── Anomaly Swim Lane ────────────────────────────────────────────────────────

const swimlaneTimeRangeSchema = timeRangeSchema
  .optional()
  .describe('Time range to scope the swim lane. When omitted the dashboard time range is used.');

const swimlaneJobIdsSchema = z
  .array(z.string().max(256))
  .min(1)
  .max(20)
  .describe('Anomaly detection job or group IDs. Must already exist.');

const swimlaneSeveritySchema = z
  .number()
  .min(0)
  .max(100)
  .optional()
  .describe('Minimum anomaly score (0–100) to show. Defaults to 0 when omitted.');

export const anomalySwimlaneOverallConfigSchema = z.object({
  job_ids: swimlaneJobIdsSchema,
  title: panelTitleSchema,
  severity_threshold: swimlaneSeveritySchema,
  swimlane_type: z
    .literal('overall')
    .describe(
      'Shows the highest anomaly score per time bucket aggregated across all selected jobs.'
    ),
  time_range: swimlaneTimeRangeSchema,
});

export const anomalySwimlaneViewByConfigSchema = z.object({
  job_ids: swimlaneJobIdsSchema,
  title: panelTitleSchema,
  severity_threshold: swimlaneSeveritySchema,
  swimlane_type: z
    .literal('viewBy')
    .describe('Splits anomaly scores by the values of a chosen field.'),
  view_by: z
    .string()
    .min(1)
    .max(256)
    .describe('Field to split by (e.g. "host.name"). Required when swimlane_type is "viewBy".'),
  time_range: swimlaneTimeRangeSchema,
});

export const anomalySwimlaneConfigSchema = z.discriminatedUnion('swimlane_type', [
  anomalySwimlaneOverallConfigSchema,
  anomalySwimlaneViewByConfigSchema,
]);

export const anomalySwimlaneConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('ml_anomaly_swimlane'),
  grid: panelGridSchema,
  config: anomalySwimlaneConfigSchema.describe(
    'Anomaly swim lane configuration. Use swimlane_type "overall" for a cross-job summary, or "viewBy" with a view_by field to break out by entity.'
  ),
});

export const editAnomalySwimlaneConfigInputSchema = anomalySwimlaneConfigInputSchema
  .omit({ grid: true })
  .extend({
    panelId: panelIdSchema.describe('Existing anomaly swim lane panel id to update.'),
    config: anomalySwimlaneConfigSchema.describe(
      'New anomaly swim lane configuration. Fully replaces the existing config.'
    ),
  });

export const anomalySwimlaneDefinition = definePanelType({
  embeddableType: 'ml_anomaly_swimlane',
  validateConfigEdit: validateSameEmbeddableType('ml_anomaly_swimlane', 'anomaly swim lane'),
});

// ─── Single Metric Viewer ─────────────────────────────────────────────────────

export const singleMetricViewerConfigSchema = z.object({
  job_ids: z
    .array(z.string().max(256))
    .min(1)
    .max(1)
    .describe(
      'Exactly one anomaly detection job ID whose results are shown in the single metric viewer.'
    ),
  title: panelTitleSchema,
  selected_detector_index: z
    .number()
    .min(0)
    .optional()
    .describe(
      'Zero-based index of the detector within the job whose results are shown. Defaults to 0 when omitted.'
    ),
  selected_entities: z
    .record(z.string().max(256), z.union([z.string().max(10000), z.number()]).optional())
    .optional()
    .describe(
      'Values of the partition, by, or over fields that identify the single time series to display.'
    ),
  function_description: z
    .string()
    .max(1000)
    .optional()
    .describe('For metric detectors: which value to plot — "min", "max", or "mean".'),
  forecast_id: z
    .string()
    .max(1000)
    .optional()
    .describe('Identifier of a forecast to overlay on the chart.'),
  time_range: timeRangeSchema
    .optional()
    .describe('Time range to scope the viewer. When omitted the dashboard time range is used.'),
});

export const singleMetricViewerConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('ml_single_metric_viewer'),
  grid: panelGridSchema,
  config: singleMetricViewerConfigSchema.describe(
    'Single metric viewer configuration. job_ids must contain exactly one job ID. Set selected_entities only when the job has partition/by/over fields and the user wants a specific entity.'
  ),
});

export const editSingleMetricViewerConfigInputSchema = singleMetricViewerConfigInputSchema
  .omit({ grid: true })
  .extend({
    panelId: panelIdSchema.describe('Existing single metric viewer panel id to update.'),
    config: singleMetricViewerConfigSchema.describe(
      'New single metric viewer configuration. Fully replaces the existing config.'
    ),
  });

export const singleMetricViewerPanelDefinition = definePanelType({
  embeddableType: 'ml_single_metric_viewer',
  validateConfigEdit: validateSameEmbeddableType('ml_single_metric_viewer', 'single metric viewer'),
});
