/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { storedFilterSchema, querySchema, timeRangeSchema } from '@kbn/es-query-server';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { layersSchema } from '../layer_schemas';
import { settingsSchema } from './settings_schema';

export const mapCenterSchema = schema.object({
  lat: schema.number(),
  lon: schema.number(),
});

export const adhocDataViewSchema = schema.object({
  allowHidden: schema.maybe(schema.boolean()),
  id: schema.string(),
  name: schema.maybe(
    schema.string({
      meta: {
        description: 'Human readable name used to differentiate the data view.',
      },
    })
  ),
  timeFieldName: schema.maybe(schema.string()),
  title: schema.string({
    meta: {
      description:
        'Contrary to its name, this property sets the index pattern of the data view. (e.g. `logs-*,metrics-*`)',
    },
  }),
});

export const mapAttributesSchema = schema.object(
  {
    adHocDataViews: schema.maybe(schema.arrayOf(adhocDataViewSchema)),
    center: schema.maybe(mapCenterSchema),
    description: schema.maybe(schema.string()),
    filters: schema.maybe(schema.arrayOf(storedFilterSchema)),
    isLayerTOCOpen: schema.maybe(
      schema.boolean({
        defaultValue: true,
        meta: {
          description: 'Set to false to display map with collapsed legend.',
        },
      })
    ),
    layers: schema.maybe(
      schema.arrayOf(layersSchema, {
        defaultValue: [],
        meta: {
          description: 'Map layers. When not provided, map contain configured base map.',
        },
      })
    ),
    openTOCDetails: schema.maybe(
      schema.arrayOf(
        schema.string({
          meta: {
            description: 'Add layer id to array to expand layer details in legend',
          },
        })
      )
    ),
    query: schema.maybe(querySchema),
    refreshInterval: schema.maybe(refreshIntervalSchema),
    settings: schema.maybe(settingsSchema),
    timeFilters: schema.maybe(timeRangeSchema),
    title: schema.string(),
    zoom: schema.maybe(
      schema.number({
        max: 24,
        min: 0,
      })
    ),
  },
  { unknowns: 'forbid' }
);
