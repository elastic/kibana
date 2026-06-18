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
import {
  CHANGE_POINT_CHART_DEFAULT_AGG_FUNCTION,
  CHANGE_POINT_CHART_DEFAULT_SERIES,
  CHANGE_POINT_CHART_MAX_SERIES,
  CHANGE_POINT_DETECTION_VIEW_TYPE,
} from '@kbn/aiops-change-point-detection/constants';

const aggregationFunctionSchema = z
  .union([z.literal('avg'), z.literal('sum'), z.literal('min'), z.literal('max')])
  .default(CHANGE_POINT_CHART_DEFAULT_AGG_FUNCTION)
  .meta({ description: 'The aggregation function used to calculate the metric values.' });

const viewTypeSchema = z
  .union([
    z.literal(CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS),
    z.literal(CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE),
  ])
  .default(CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS)
  .meta({ description: 'The type of change point detection view to display.' });

export const changePointChartEmbeddableStateSchema = z
  .object({
    ...serializedTitlesSchema.shape,
    ...serializedTimeRangeSchema.shape,
    data_view_id: z.string().min(1).meta({
      description: 'The data view ID used to run change point detection.',
    }),
    view_type: viewTypeSchema,
    aggregation_function: aggregationFunctionSchema,
    metric_field: z.string().min(1).meta({
      description: 'The metric field used by the aggregation function.',
    }),
    split_field: z.string().min(1).optional().meta({
      description: 'The optional field used to split change point results.',
    }),
    partitions: z
      .array(z.string().min(1))
      .max(10000)
      .optional()
      .meta({ description: 'Optional split field values to include in the panel.' }),
    max_series_to_plot: z
      .number()
      .int()
      .min(1)
      .max(CHANGE_POINT_CHART_MAX_SERIES)
      .default(CHANGE_POINT_CHART_DEFAULT_SERIES)
      .meta({
        description: `The maximum number of change points to visualize. Defaults to ${CHANGE_POINT_CHART_DEFAULT_SERIES}.`,
      }),
  })
  .strict()
  .refine((value) => value.partitions === undefined || value.split_field !== undefined, {
    message: '`partitions` requires `split_field` to be set',
  })
  .meta({
    id: 'aiops_change_point_chart',
    description: 'Change point detection chart embeddable schema',
  });

export type ChangePointChartEmbeddableState = z.output<
  typeof changePointChartEmbeddableStateSchema
>;

export type ChangePointAggregationFunction = z.output<typeof aggregationFunctionSchema>;
