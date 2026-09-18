/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import {
  anomalyChartsEmbeddableStateSchema,
  severityThresholdSchema,
} from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import {
  anomalySwimLaneOverallSchema,
  anomalySwimLaneViewBySchema,
} from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import { singleMetricViewerEmbeddableStateSchema } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
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
 * Config shapes come from `@kbn/ml-server-schemas` so dashboard generation
 * accepts the same payload as ML chart attachments. Anomaly charts additionally
 * accept a numeric `severity_threshold` and map it to the embeddable's
 * open-ended `{ min }` range.
 */

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
  ...anomalyChartsEmbeddableStateSchema.shape,
  // Agent-facing number plus the embeddable array form (e.g. forwarded attachments).
  severity_threshold: z
    .union([
      z
        .number()
        .min(0)
        .max(100)
        .describe('Minimum anomaly score (0–100) to display. Defaults to 25 when omitted.'),
      z.array(severityThresholdSchema).max(5),
    ])
    .optional()
    .describe(
      'Minimum anomaly score to display. A number N means scores >= N. An array of { min, max? } ranges is also accepted (for example from an ML chart attachment).'
    ),
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
    const normalizedThreshold =
      typeof severityThreshold === 'number' ? [{ min: severityThreshold }] : severityThreshold;
    return {
      type: 'ml_anomaly_charts',
      config: {
        ...rest,
        ...(normalizedThreshold != null ? { severity_threshold: normalizedThreshold } : {}),
      },
    };
  },
  validateConfigEdit: validateSameEmbeddableType('ml_anomaly_charts', 'anomaly charts'),
});

// ─── Anomaly Swim Lane ────────────────────────────────────────────────────────

export const anomalySwimlaneOverallConfigSchema = anomalySwimLaneOverallSchema;
export const anomalySwimlaneViewByConfigSchema = anomalySwimLaneViewBySchema;

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

export const singleMetricViewerConfigSchema = singleMetricViewerEmbeddableStateSchema.extend({
  selected_detector_index: z
    .number()
    .min(0)
    .optional()
    .describe(
      'Zero-based index of the detector within the job whose results are shown. Defaults to 0 when omitted.'
    ),
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
