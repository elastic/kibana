/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { namedColorSchema, z } from '@elastic/isomer-sdk';
import {
  MAP_MAX_ARCS,
  MAP_MAX_BASEMAP_TILES,
  MAP_MAX_CELLS,
  MAP_MAX_LAYERS,
  MAP_MAX_MARKERS,
  MAP_MAX_REGIONS,
  MAP_RAMPS,
  MAP_REGION_SETS,
} from './types';

const lat = z.number().min(-90).max(90);
const lon = z.number().min(-180).max(180);
const tone = namedColorSchema;
const ramp = z.enum(MAP_RAMPS);
const side = z.number().int().min(16).max(4096);

const markerSchema = z.object({
  id: z.string().min(1).max(128),
  lat,
  lon,
  label: z.string().max(80).optional(),
  tone: tone.optional(),
  value: z.number().finite().optional(),
  size: z.number().finite().optional(),
  group: z.string().max(64).optional(),
});

const cellSchema = z.object({
  key: z.string().min(1).max(64),
  value: z.number().finite(),
});

const regionSchema = z.object({
  code: z.string().min(1).max(80),
  label: z.string().max(80).optional(),
  value: z.number().finite(),
  tone: tone.optional(),
});

const arcSchema = z.object({
  from: z.tuple([lat, lon]),
  to: z.tuple([lat, lon]),
  label: z.string().max(80).optional(),
  weight: z.number().finite().nonnegative().optional(),
  tone: tone.optional(),
});

const basemapTileSchema = z.object({
  col: z.number().int().min(0).max(15),
  row: z.number().int().min(0).max(15),
  src: z.string().min(1).max(120000),
});

const regionSetSchema = z
  .string()
  .regex(/^[a-z0-9_]+$/)
  .max(100)
  .describe(`An EMS boundary file id, such as ${MAP_REGION_SETS.join(', ')}.`);
const regionKeySchema = z
  .string()
  .min(1)
  .max(100)
  .describe(
    'The boundary property each region’s code matches; defaults by region set, else `name`.'
  );
const markerSizeSchema = z.object({
  min: z.number().min(0).max(200),
  max: z.number().min(0).max(200),
});
const markerLabelsSchema = z.enum(['beside', 'inside']);
const cellShapeSchema = z.enum(['grid', 'hex', 'heatmap']);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const opacity = z.number().min(0).max(1);

const layerSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('regions'),
    color: color.optional(),
    opacity: opacity.optional(),
    regions: z.array(regionSchema).max(MAP_MAX_REGIONS),
    regionSet: regionSetSchema,
    regionKey: regionKeySchema.optional(),
    regionRamp: ramp.optional(),
  }),
  z.object({
    kind: z.literal('markers'),
    color: color.optional(),
    opacity: opacity.optional(),
    markers: z.array(markerSchema).max(MAP_MAX_MARKERS),
    markerRamp: ramp.optional(),
    markerSize: markerSizeSchema.optional(),
    markerLabels: markerLabelsSchema.optional(),
  }),
  z.object({
    kind: z.literal('cells'),
    color: color.optional(),
    opacity: opacity.optional(),
    cells: z.array(cellSchema).max(MAP_MAX_CELLS),
    cellShape: cellShapeSchema.optional(),
    cellRamp: ramp.optional(),
  }),
  z.object({
    kind: z.literal('arcs'),
    color: color.optional(),
    opacity: opacity.optional(),
    arcs: z.array(arcSchema).max(MAP_MAX_ARCS),
  }),
]);

const tmsCoord = z.number().int().min(0).max(1023);

export const mapSchema = z.object({
  type: z.literal('map'),
  label: z.string().max(120).optional(),
  width: side.optional(),
  height: side.optional(),
  view: z
    .union([
      z.literal('fit'),
      z.object({
        lat,
        lon,
        zoom: z.number().min(0).max(24),
      }),
    ])
    .optional(),
  markers: z.array(markerSchema).max(MAP_MAX_MARKERS).optional(),
  markerRamp: ramp.optional(),
  markerSize: markerSizeSchema.optional(),
  markerLabels: markerLabelsSchema.optional(),
  cells: z.array(cellSchema).max(MAP_MAX_CELLS).optional(),
  cellShape: cellShapeSchema.optional(),
  cellRamp: ramp.optional(),
  regions: z.array(regionSchema).max(MAP_MAX_REGIONS).optional(),
  regionSet: regionSetSchema.optional(),
  regionKey: regionKeySchema.optional(),
  regionRamp: ramp.optional(),
  arcs: z.array(arcSchema).max(MAP_MAX_ARCS).optional(),
  layers: z.array(layerSchema).max(MAP_MAX_LAYERS).optional(),
  legend: z.object({ unit: z.string().max(32).optional() }).optional(),
  basemap: z
    .object({
      tiles: z.array(basemapTileSchema).max(MAP_MAX_BASEMAP_TILES).optional(),
      columns: z.number().int().min(1).max(4).optional(),
      rows: z.number().int().min(1).max(4).optional(),
      zoom: z.number().int().min(0).max(10).optional(),
      originX: tmsCoord.optional(),
      originY: tmsCoord.optional(),
      attribution: z.string().max(400).optional(),
      unavailable: z.boolean().optional(),
    })
    .optional(),
});
