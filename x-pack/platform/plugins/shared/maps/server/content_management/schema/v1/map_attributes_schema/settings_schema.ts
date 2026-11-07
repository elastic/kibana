/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { INITIAL_LOCATION } from '../../../../../common';

export const customIconSchema = z
  .object({
    symbol_id: z.string(),
    svg: z.string(),
    label: z.string(),
    cutoff: z.number(),
    radius: z.number(),
  })
  .strict();

export const settingsSchema = z
  .object({
    auto_fit_to_data_bounds: z.boolean().optional(),
    background_color: z.string().optional(),
    custom_icons: z.array(customIconSchema).optional(),
    disable_interactive: z.boolean().optional(),
    disable_tooltip_control: z.boolean().optional(),
    hide_toolbar_overlay: z.boolean().optional(),
    hide_layer_control: z.boolean().optional(),
    hide_view_control: z.boolean().optional(),
    initial_location: z
      .union([
        z.literal(INITIAL_LOCATION.LAST_SAVED_LOCATION),
        z.literal(INITIAL_LOCATION.FIXED_LOCATION),
        z.literal(INITIAL_LOCATION.BROWSER_LOCATION),
        z.literal(INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS),
      ])
      .optional(),
    fixed_location: z
      .object({
        lat: z.number(),
        lon: z.number(),
        zoom: z.number(),
      })
      .strict()
      .optional(),
    browser_location: z
      .object({
        zoom: z.number(),
      })
      .strict()
      .optional(),
    keydown_scroll_zoom: z.boolean().optional(),
    max_zoom: z.number().optional(),
    min_zoom: z.number().optional(),
    projection: z.union([z.literal('globeInterpolate'), z.literal('mercator')]).optional(),
    show_scale_control: z.boolean().optional(),
    show_spatial_filters: z.boolean().optional(),
    show_timeslider_toggle_button: z.boolean().optional(),
    spatial_filters_alpa: z.number().optional(),
    spatial_filters_fill_color: z.string().optional(),
    spatial_filters_line_color: z.string().optional(),
  })
  .strict();
