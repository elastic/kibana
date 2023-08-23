/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NormalizationOptions {
  baselineScale: number;
  baselineTime: number;
  comparisonScale: number;
  comparisonTime: number;
}

export enum ComparisonMode {
  Absolute = 'absolute',
  Relative = 'relative',
}

export enum NormalizationMode {
  Scale = 'scale',
  Time = 'time',
}
