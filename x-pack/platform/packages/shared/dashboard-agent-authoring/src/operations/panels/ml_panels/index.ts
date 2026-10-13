/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { anomalyChartsEmbeddableStateSchema } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import {
  anomalySwimLaneOverallSchema,
  anomalySwimLaneViewBySchema,
} from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import { singleMetricViewerEmbeddableStateSchema } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
import { z } from '@kbn/zod/v4';
import { defineConfigPanelKind } from '../panel_kind';

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
 * Config shapes come from `@kbn/ml-server-schemas`, flattened where the model
 * only needs a simpler form: anomaly charts take a numeric `severity_threshold`
 * mapped to the embeddable's open-ended `{ min }` range, and the swim lane takes
 * one object whose `view_by` is required only for view-by swim lanes.
 */

const panelIdSchema = z.string().max(256);

// ─── Anomaly Charts ───────────────────────────────────────────────────────────

export const anomalyChartsPanelConfigSchema = z.object({
  ...anomalyChartsEmbeddableStateSchema.shape,
  severity_threshold: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(
      'Minimum anomaly score (0–100) to display. Omit to show all scores. Typical values: 25 (minor+), 50 (major+), 75 (critical only).'
    ),
});

const anomalyChartsPanelConfigInputSchema = z.object({
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

export const anomalyChartsPanelKind = defineConfigPanelKind({
  type: 'ml_anomaly_charts',
  embeddableType: 'ml_anomaly_charts',
  label: 'anomaly charts',
  addInputSchema: anomalyChartsPanelConfigInputSchema,
  editInputSchema: editAnomalyChartsPanelConfigInputSchema,
  toEmbeddableConfig: (config) => {
    const { severity_threshold: severityThreshold, ...rest } = config;
    return {
      ...rest,
      ...(typeof severityThreshold === 'number'
        ? { severity_threshold: [{ min: severityThreshold }] }
        : {}),
    };
  },
});

// ─── Anomaly Swim Lane ────────────────────────────────────────────────────────

/** Both swim lane variants as one object, so the model sees their shared fields once. */
export const anomalySwimlaneConfigSchema = anomalySwimLaneOverallSchema
  .extend({
    swimlane_type: z.enum([
      anomalySwimLaneOverallSchema.shape.swimlane_type.value,
      anomalySwimLaneViewBySchema.shape.swimlane_type.value,
    ]),
    view_by: anomalySwimLaneViewBySchema.shape.view_by
      .optional()
      .describe(
        'Field name used to split anomalies into a view-by swim lane. Required when swimlane_type is "viewBy".'
      ),
  })
  .superRefine(({ swimlane_type: swimlaneType, view_by: viewBy }, ctx) => {
    if (swimlaneType === 'viewBy' && !viewBy) {
      ctx.addIssue({
        code: 'custom',
        path: ['view_by'],
        message: 'view_by is required when swimlane_type is "viewBy".',
      });
    }
  });

const anomalySwimlaneConfigInputSchema = z.object({
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

export const anomalySwimlanePanelKind = defineConfigPanelKind({
  type: 'ml_anomaly_swimlane',
  embeddableType: 'ml_anomaly_swimlane',
  label: 'anomaly swim lane',
  addInputSchema: anomalySwimlaneConfigInputSchema,
  editInputSchema: editAnomalySwimlaneConfigInputSchema,
  toEmbeddableConfig: (config) => {
    const { view_by: viewBy, ...rest } = config;
    return rest.swimlane_type === 'viewBy' ? { ...rest, view_by: viewBy } : rest;
  },
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

const singleMetricViewerConfigInputSchema = z.object({
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

export const singleMetricViewerPanelKind = defineConfigPanelKind({
  type: 'ml_single_metric_viewer',
  embeddableType: 'ml_single_metric_viewer',
  label: 'single metric viewer',
  addInputSchema: singleMetricViewerConfigInputSchema,
  editInputSchema: editSingleMetricViewerConfigInputSchema,
});
