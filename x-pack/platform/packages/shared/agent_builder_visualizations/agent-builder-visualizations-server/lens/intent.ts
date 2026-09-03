/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { HouseStylePreserve } from './house_style';

const PALETTE_IDS = [
  'status',
  'temperature',
  'complementary',
  'negative',
  'positive',
  'cool',
  'warm',
  'gray',
] as const;

const HOUSE_STYLE_PRESERVE = [
  'panel_title',
  'axis_titles',
  'legend_position',
  'legend_visibility',
  'area_fill',
  'series_colors',
  'metric_color',
  'table_cell_colors',
] as const satisfies readonly HouseStylePreserve[];

const LEGEND_STATISTICS = [
  'min',
  'max',
  'avg',
  'median',
  'range',
  'last_value',
  'last_non_null_value',
  'first_value',
  'first_non_null_value',
  'difference',
  'difference_percentage',
  'count',
  'total',
  'standard_deviation',
  'variance',
  'distinct_count',
  'current_and_last_value',
] as const;

const SERIES_TYPES = ['line', 'area', 'bar', 'bar_stacked', 'bar_horizontal'] as const;

const UNIT_IDS = ['percent', 'bytes', 'bits', 'ms', 's', 'us', 'ns'] as const;

const TABLE_SUMMARIES = ['sum', 'avg', 'count', 'min', 'max'] as const;

export const chartIntentSchema = z
  .object({
    preserve: z.array(z.enum(HOUSE_STYLE_PRESERVE)).optional(),
    series_type: z.enum(SERIES_TYPES).optional(),
    x_field: z.string().optional(),
    breakdown_field: z.string().optional(),
    legend_statistics: z.array(z.enum(LEGEND_STATISTICS)).optional(),
    sparkline: z.boolean().optional(),
    secondary: z
      .object({
        column: z.string().optional(),
        compare: z.enum(['previous', 'baseline']).optional(),
      })
      .optional(),
    thresholds: z
      .object({
        palette: z.enum(PALETTE_IDS),
        steps: z.array(z.number()),
        range: z.enum(['absolute', 'percentage']).optional(),
      })
      .optional(),
    units: z.record(z.string(), z.enum(UNIT_IDS)).optional(),
    table: z
      .object({
        summary: z.enum(TABLE_SUMMARIES).optional(),
        sort_by: z.string().optional(),
        hidden: z.array(z.string()).optional(),
      })
      .optional(),
    gauge: z
      .object({
        min: z.string().optional(),
        max: z.string().optional(),
        goal: z.string().optional(),
      })
      .optional(),
    region: z
      .object({
        boundaries: z.string(),
        join: z.string(),
      })
      .optional(),
  })
  .strict();

export type ChartIntent = z.output<typeof chartIntentSchema>;
