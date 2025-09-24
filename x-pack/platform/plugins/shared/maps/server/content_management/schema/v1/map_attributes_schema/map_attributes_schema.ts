/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * TODO destringify values
 */
export const mapAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.string()),
    mapStateJSON: schema.maybe(schema.string()),
    layerListJSON: schema.maybe(schema.string()),
    isLayerTOCOpen: schema.maybe(
      schema.boolean({
        defaultValue: true,
        meta: {
          description: 'Set to false to display map with collapsed legend.',
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
