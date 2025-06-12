/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type OriginString = 'bottom' | 'left' | 'top' | 'right';

export interface RepeatImageRendererConfig {
  max: number;
  count: number;
  emptyImage: string;
  image: string;
  size: number;
}

export interface NodeDimensions {
  width: number;
  height: number;
}
