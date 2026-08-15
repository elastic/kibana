/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAYER_STYLE_TYPE } from '../constants';
import type { EMSVectorTileStyleDescriptor } from '../descriptor_types';

export function createEmsVectorTileStyleDescriptor(
  color: string = ''
): EMSVectorTileStyleDescriptor {
  return {
    type: LAYER_STYLE_TYPE.EMS_VECTOR_TILE,
    color,
  };
}
