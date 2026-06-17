/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TileError, TileMetaFeature } from '../../../common/descriptor_types';

export interface TileRequest {
  layerId: string;
  tileUrl: string;
  tileError?: TileError;
  tileMetaFeature?: TileMetaFeature;
  x: number;
  y: number;
  z: number;
}
