/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const fieldMetaOptionsSchema = schema.object(
  {
    isEnabled: schema.boolean({
      meta: {
        description:
          'When set to true, dynamic style domain range and categories are calculated from entire data. Domain range and categories are fetched in seperate Elasticsearch aggregation request. Styling is consistent as users pan, zoom, and filter map. When set to false, dynamic style domain range and categories are calculated from local data and recalculated when local data changes. Styling maybe inconsistent as users pan, zoom, and filter.',
      },
    }),
    sigma: schema.maybe(schema.number()),
    percentiles: schema.maybe(schema.arrayOf(schema.number())),
  },
  {
    meta: {
      description:
        'Use to configure how dynamic styling domain ranges and categories are calculated and mapped to feature values.',
    },
  }
);
