/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { LAYER_STYLE_TYPE } from '../../../../../common/constants';

export const EMSVectorTileStyleSchema = schema.object(
  {
    color: schema.string(),
    type: schema.literal(LAYER_STYLE_TYPE.EMS_VECTOR_TILE),
  },
  {
    meta: {
      description: 'Elastic Maps Service (EMS) Vector Tile style configuration.',
    },
  }
);
