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
    symbolId: z.string(),
    svg: z.string(),
    label: z.string(),
    cutoff: z.number(),
    radius: z.number(),
  })
  .strict();

export const settingsSchema = z
  .object({
    autoFitToDataBounds: z.boolean().optional(),
    backgroundColor: z.string().optional(),
    customIcons: z.array(customIconSchema).optional(),
    disableInteractive: z.boolean().optional(),
    disableTooltipControl: z.boolean().optional(),
    hideToolbarOverlay: z.boolean().optional(),
    hideLayerControl: z.boolean().optional(),
    hideViewControl: z.boolean().optional(),
    initialLocation: z
      .union([
        z.literal(INITIAL_LOCATION.LAST_SAVED_LOCATION),
        z.literal(INITIAL_LOCATION.FIXED_LOCATION),
        z.literal(INITIAL_LOCATION.BROWSER_LOCATION),
        z.literal(INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS),
      ])
      .optional(),
    fixedLocation: z
      .object({
        lat: z.number(),
        lon: z.number(),
        zoom: z.number(),
      })
      .strict()
      .optional(),
    browserLocation: z
      .object({
        zoom: z.number(),
      })
      .strict()
      .optional(),
    keydownScrollZoom: z.boolean().optional(),
    maxZoom: z.number().optional(),
    minZoom: z.number().optional(),
    projection: z.union([z.literal('globeInterpolate'), z.literal('mercator')]).optional(),
    showScaleControl: z.boolean().optional(),
    showSpatialFilters: z.boolean().optional(),
    showTimesliderToggleButton: z.boolean().optional(),
    spatialFiltersAlpa: z.number().optional(),
    spatialFiltersFillColor: z.string().optional(),
    spatialFiltersLineColor: z.string().optional(),
  })
  .strict();
