/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAYER_STYLE_TYPE } from '../constants';
import type { StyleDescriptor } from '../descriptor_types';

export function createTileStyleDescriptor(): StyleDescriptor {
  return { type: LAYER_STYLE_TYPE.TILE };
}
