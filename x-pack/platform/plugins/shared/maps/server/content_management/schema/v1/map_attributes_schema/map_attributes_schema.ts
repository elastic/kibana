/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { layersSchema } from '../layer_schemas';

/**
 * TODO destringify values
 */
export const mapAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.string()),
    mapStateJSON: schema.maybe(schema.string()),
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
  },
  { unknowns: 'forbid' }
);
