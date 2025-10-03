/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INITIAL_LOCATION } from '../../../../../common';

export const customIconSchema = schema.object({
  symbolId: schema.string(),
  svg: schema.string(),
  label: schema.string(),
  cutoff: schema.number(),
  radius: schema.number(),
});

export const settingsSchema = schema.object({
  autoFitToDataBounds: schema.maybe(schema.boolean()),
  backgroundColor: schema.maybe(schema.string()),
  customIcons: schema.maybe(schema.arrayOf(customIconSchema)),
  disableInteractive: schema.maybe(schema.boolean()),
  disableTooltipControl: schema.maybe(schema.boolean()),
  hideToolbarOverlay: schema.maybe(schema.boolean()),
  hideLayerControl: schema.maybe(schema.boolean()),
  hideViewControl: schema.maybe(schema.boolean()),
  initialLocation: schema.maybe(
    schema.oneOf([
      schema.literal(INITIAL_LOCATION.LAST_SAVED_LOCATION),
      schema.literal(INITIAL_LOCATION.FIXED_LOCATION),
      schema.literal(INITIAL_LOCATION.BROWSER_LOCATION),
      schema.literal(INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS),
    ])
  ),
  fixedLocation: schema.maybe(
    schema.object({
      lat: schema.number(),
      lon: schema.number(),
      zoom: schema.number(),
    })
  ),
  browserLocation: schema.maybe(
    schema.object({
      zoom: schema.number(),
    })
  ),
  keydownScrollZoom: schema.maybe(schema.boolean()),
  maxZoom: schema.maybe(schema.number()),
  minZoom: schema.maybe(schema.number()),
  projection: schema.maybe(
    schema.oneOf([schema.literal('globeInterpolate'), schema.literal('mercator')])
  ),
  showScaleControl: schema.maybe(schema.boolean()),
  showSpatialFilters: schema.maybe(schema.boolean()),
  showTimesliderToggleButton: schema.maybe(schema.boolean()),
  spatialFiltersAlpa: schema.maybe(schema.number()),
  spatialFiltersFillColor: schema.maybe(schema.string()),
  spatialFiltersLineColor: schema.maybe(schema.string()),
});
