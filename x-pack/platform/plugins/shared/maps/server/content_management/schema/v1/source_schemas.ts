/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SOURCE_TYPES } from '../../../../common';

export const EMSTMSSourceSchema = schema.object(
  {
    id: schema.maybe(schema.string({
      meta: { description: 'Tile Map Service (TMS) layer id from Elastic Maps Service (EMS). Required when isAutoSelect is false.' },
    })),
  type: schema.literal(SOURCE_TYPES.EMS_TMS),
    isAutoSelect: schema.maybe(schema.boolean({
      defaultValue: false,
      meta: {
        description: 'When true, EMS TMS layer mirrows the Kibana theme, displaying light basemap tiles with light theme and dark basemap tiles with dark theme.'
      }
    })),
    lightModeDefault: schema.maybe(schema.string({
      meta: {
        description: 'BWC flag to preserve auto selected bright basemap tiles for maps created before 8.0.'
      }
    })),
  },
  {
    meta: {
      description: 'Basemap from Elastic Maps Service (EMS) Tile Map Service (TMS).',
    },
    unknowns: 'forbid'
  }
);