/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ControlValuesSource,
  DEFAULT_DSL_OPTIONS_LIST_STATE,
  DEFAULT_RANGE_SLIDER_STATE,
  DEFAULT_TIME_SLIDER_STATE,
} from '@kbn/controls-constants';
import type { DashboardPinnedPanel } from '@kbn/dashboard-plugin/server';
import { z } from '@kbn/zod/v4';
import { defineOperation } from './types';

const controlWidthSchema = z
  .enum(['small', 'medium', 'large'])
  .describe('Control width. Defaults to "medium".');

const dataControlFields = {
  field_name: z
    .string()
    .min(1)
    .describe('Exact field name as it appears in the panel ES|QL queries (e.g. "service.name").'),
  index: z
    .string()
    .min(1)
    .describe('Index, alias, or datastream to query for values (e.g. "logs-*").'),
};

const optionsListControlInputSchema = z.object({
  type: z.literal('options_list_control'),
  ...dataControlFields,
  title: z.string().optional().describe('Human-readable label shown above the control.'),
  width: controlWidthSchema.optional(),
  grow: z
    .boolean()
    .optional()
    .describe('Expand to fill available horizontal space. Defaults to true.'),
});

const rangeSliderControlInputSchema = z.object({
  type: z.literal('range_slider_control'),
  ...dataControlFields,
  title: z.string().optional().describe('Human-readable label shown above the control.'),
  width: controlWidthSchema.optional(),
  grow: z.boolean().optional(),
});

const timeSliderControlInputSchema = z.object({
  type: z.literal('time_slider_control'),
  width: controlWidthSchema.optional(),
  grow: z.boolean().optional(),
});

const controlInputSchema = z.discriminatedUnion('type', [
  optionsListControlInputSchema,
  rangeSliderControlInputSchema,
  timeSliderControlInputSchema,
]);

type ControlInput = z.infer<typeof controlInputSchema>;

const buildStoredControl = (control: ControlInput): DashboardPinnedPanel => {
  const { type, width = 'medium', grow = true } = control;
  const id = uuidv4();

  if (type === 'time_slider_control') {
    const config = {
      ...DEFAULT_TIME_SLIDER_STATE,
    } satisfies Extract<DashboardPinnedPanel, { type: 'time_slider_control' }>['config'];

    return {
      type,
      id,
      width,
      grow,
      config,
    };
  }

  if (type === 'options_list_control') {
    const { field_name, index, title } = control;
    const config = {
      ...DEFAULT_DSL_OPTIONS_LIST_STATE,
      ...(title !== undefined ? { title } : {}),
      values_source: ControlValuesSource.ESQL,
      esql_query: `FROM ${index} | STATS BY ${field_name}`,
    } satisfies Extract<DashboardPinnedPanel, { type: 'options_list_control' }>['config'];

    return {
      type,
      id,
      width,
      grow,
      config,
    };
  }

  const { field_name, index, title } = control;
  const config = {
    ...DEFAULT_RANGE_SLIDER_STATE,
    ...(title !== undefined ? { title } : {}),
    values_source: ControlValuesSource.ESQL,
    esql_query: `FROM ${index} | STATS BY ${field_name}`,
  } satisfies Extract<DashboardPinnedPanel, { type: 'range_slider_control' }>['config'];

  return {
    type,
    id,
    width,
    grow,
    config,
  };
};

export const addControlsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_controls'),
    controls: z
      .array(controlInputSchema)
      .min(1)
      .describe(
        'Controls to append. Use options_list_control for categorical/keyword fields, range_slider_control for numeric fields, time_slider_control for time sub-range filtering (at most one per dashboard).'
      ),
  }),
  handler: ({ dashboardData, operation }) => {
    const newControls = operation.controls.map(buildStoredControl);
    return {
      ...dashboardData,
      pinned_panels: [...(dashboardData.pinned_panels ?? []), ...newControls],
    };
  },
});
