/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SOURCE_TYPES } from '../../../../../common';

export const EMSFileSourceSchema = schema.object(
  {
    id: schema.string({
      meta: { description: 'Administrative boundaries layer id from Elastic Maps Service (EMS).' },
    }),
    type: schema.literal(SOURCE_TYPES.EMS_FILE),
    tooltipProperties: schema.maybe(
      schema.arrayOf(schema.string(), {
        meta: {
          description: 'Administrative boundary properties displayed in tooltip.',
        },
      })
    ),
  },
  {
    meta: {
      description: 'Administrative boundaries from Elastic Maps Service (EMS).',
    },
    unknowns: 'forbid',
  }
);

export const EMSTMSSourceSchema = schema.object(
  {
    id: schema.maybe(
      schema.string({
        meta: {
          description:
            'Tile Map Service (TMS) layer id from Elastic Maps Service (EMS). Required when isAutoSelect is false.',
        },
      })
    ),
    type: schema.literal(SOURCE_TYPES.EMS_TMS),
    isAutoSelect: schema.maybe(
      schema.boolean({
        defaultValue: false,
        meta: {
          description:
            'When true, EMS TMS layer mirrows the Kibana theme, displaying light basemap tiles with light theme and dark basemap tiles with dark theme.',
        },
      })
    ),
    lightModeDefault: schema.maybe(
      schema.string({
        meta: {
          description:
            'BWC flag to preserve auto selected bright basemap tiles for maps created before 8.0.',
        },
      })
    ),
  },
  {
    meta: {
      description: 'Basemap from Elastic Maps Service (EMS) Tile Map Service (TMS).',
    },
    unknowns: 'forbid',
  }
);

export const kibanaTilemapSourceSchema = schema.object(
  {
    type: schema.literal(SOURCE_TYPES.KIBANA_TILEMAP),
  },
  {
    meta: {
      description: `Tile map service configured by 'map.tilemap.url' kibana.yml setting.`,
    },
    unknowns: 'forbid',
  }
);

export const WMSSourceSchema = schema.object(
  {
    serviceUrl: schema.uri({
      meta: {
        description: 'WMS URL'
      }
    }),
    layers: schema.string({
      meta: {
        description: 'Comma separated list of layer names'
      }
    }),
    styles: schema.string({
      meta: {
        description: 'Comma separated list of style names'
      }
    }),
    type: schema.literal(SOURCE_TYPES.WMS),
  },
  {
    meta: {
      description: 'Raster source from Web Map Service (WMS)',
    },
    unknowns: 'forbid',
  }
);

export const XYZTMSSourceSchema = schema.object(
  {
    urlTemplate: schema.uri({
      meta: {
        description: 'TMS URL'
      }
    }),
    type: schema.literal(SOURCE_TYPES.EMS_XYZ),
  },
  {
    meta: {
      description: 'Raster source from Tile Map Service (TMS)',
    },
    unknowns: 'forbid',
  }
);
