/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const controlWidthSchema = z.enum(['small', 'medium', 'large']);

const optionsListControlConfigSchema = z.looseObject({
  data_view_id: z.string(),
  field_name: z.string(),
  title: z.string().optional(),
});

const rangeSliderControlConfigSchema = z.looseObject({
  data_view_id: z.string(),
  field_name: z.string(),
  title: z.string().optional(),
  step: z.number().optional(),
  value: z.tuple([z.string(), z.string()]).optional(),
});

const optionsListPinnedPanelStateSchema = z.object({
  type: z.literal('optionsListControl'),
  uid: z.string(),
  width: controlWidthSchema.optional(),
  grow: z.boolean().optional(),
  config: optionsListControlConfigSchema,
});

const rangeSliderPinnedPanelStateSchema = z.object({
  type: z.literal('rangeSliderControl'),
  uid: z.string(),
  width: controlWidthSchema.optional(),
  grow: z.boolean().optional(),
  config: rangeSliderControlConfigSchema,
});

/**
 * Zod schema for dashboard pinned control panel state.
 */
export const dashboardPinnedPanelStateSchema = z.union([
  optionsListPinnedPanelStateSchema,
  rangeSliderPinnedPanelStateSchema,
]);

/**
 * Pinned control state rendered above the dashboard viewport.
 */
export type DashboardPinnedPanelState = z.infer<typeof dashboardPinnedPanelStateSchema>;
