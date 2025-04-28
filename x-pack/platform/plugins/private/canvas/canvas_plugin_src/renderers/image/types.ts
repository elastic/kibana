/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImageMode } from '../../../i18n/functions/dict/image';

export type OriginString = 'bottom' | 'left' | 'top' | 'right';

export interface ImageRendererConfig {
  dataurl: string | null;
  mode: ImageMode | null;
}

export interface NodeDimensions {
  width: number;
  height: number;
}
