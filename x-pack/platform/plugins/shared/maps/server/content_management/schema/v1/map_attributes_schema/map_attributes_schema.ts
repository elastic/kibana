/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { storedFilterSchema, querySchema, timeRangeSchema } from '@kbn/es-query-server';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { layersSchema } from '../layer_schemas';
import { settingsSchema } from './settings_schema';

export const mapCenterSchema = z
  .object({
    lat: z.number(),
    lon: z.number(),
  })
  .strict();

export const adhocDataViewSchema = z.object({
  allowHidden: z.boolean().optional(),
  id: z.string(),
  name: z.string().optional().meta({
    description: 'Human readable name used to differentiate the data view.',
  }),
  timeFieldName: z.string().optional(),
  title: z.string().meta({
    description:
      'Contrary to its name, this property sets the index pattern of the data view. (e.g. `logs-*,metrics-*`)',
  }),
  // TODO runtime fields is missing
});

export const mapAttributesSchema = z
  .object({
    adHocDataViews: z.array(adhocDataViewSchema).optional(),
    center: mapCenterSchema.optional(),
    description: z.string().optional(),
    filters: z.array(storedFilterSchema).optional(),
    isLayerTOCOpen: z.boolean().default(true).optional().meta({
      description: 'Set to false to display map with collapsed legend.',
    }),
    layers: z.array(layersSchema).default([]).optional().meta({
      description: 'Map layers. When not provided, map contain configured base map.',
    }),
    openTOCDetails: z
      .array(
        z.string().meta({
          description: 'Add layer id to array to expand layer details in legend',
        })
      )
      .optional(),
    query: querySchema.optional(),
    refreshInterval: refreshIntervalSchema.optional(),
    settings: settingsSchema.optional(),
    timeFilters: timeRangeSchema.optional(),
    title: z.string(),
    zoom: z.number().min(0).max(24).optional(),
  })
  .strict();
