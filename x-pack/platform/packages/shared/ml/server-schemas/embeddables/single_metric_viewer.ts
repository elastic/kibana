/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { mlEntityFieldValueSchema } from '@kbn/ml-anomaly-utils/schemas';

export const singleMetricViewerEmbeddableStateSchema = z
  .object({
    ...serializedTitlesSchema.shape,
    ...serializedTimeRangeSchema.shape,
    job_ids: z.array(z.string().min(1).max(1000)).min(1).max(1).meta({
      description: 'Anomaly detection job ID whose results are shown in the single metric viewer.',
    }),
    selected_detector_index: z.number().min(0).default(0).meta({
      description:
        'Zero-based index of the detector (the Elasticsearch detector_index) within the job whose results are shown.',
    }),
    selected_entities: z
      .record(z.string().max(1000), mlEntityFieldValueSchema.optional())
      .optional()
      .meta({
        description:
          'Values of the partition, by, or over fields that identify the single time series to display.',
      }),
    function_description: z.string().max(1000).optional().meta({
      description:
        'For detectors that use the `metric` function, selects which value to plot: `min`, `max`, or `mean`. Ignored for other detector functions. When omitted, the viewer derives a default from the highest-scoring anomaly record.',
    }),
    forecast_id: z.string().max(1000).optional().meta({
      description: 'Identifier of a forecast to overlay on the chart.',
    }),
  })
  .strip()
  .meta({
    id: 'ml_single_metric_viewer',
    description: 'Single Metric Viewer embeddable',
  });

export type SingleMetricViewerEmbeddableState = z.output<
  typeof singleMetricViewerEmbeddableStateSchema
>;
