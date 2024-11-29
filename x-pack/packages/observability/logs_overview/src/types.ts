/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface LogCategory {
  change: LogCategoryChange;
  documentCount: number;
  histogram: LogCategoryHistogramBucket[];
  terms: string;
}

export type LogCategoryChange =
  | LogCategoryNoChange
  | LogCategoryRareChange
  | LogCategorySpikeChange
  | LogCategoryDipChange
  | LogCategoryStepChange
  | LogCategoryDistributionChange
  | LogCategoryTrendChange
  | LogCategoryOtherChange
  | LogCategoryUnknownChange;

export interface LogCategoryNoChange {
  type: 'none';
}

export interface LogCategoryRareChange {
  type: 'rare';
  timestamp: string;
}

export interface LogCategorySpikeChange {
  type: 'spike';
  timestamp: string;
}

export interface LogCategoryDipChange {
  type: 'dip';
  timestamp: string;
}

export interface LogCategoryStepChange {
  type: 'step';
  timestamp: string;
}

export interface LogCategoryTrendChange {
  type: 'trend';
  timestamp: string;
  correlationCoefficient: number;
}

export interface LogCategoryDistributionChange {
  type: 'distribution';
  timestamp: string;
}

export interface LogCategoryOtherChange {
  type: 'other';
  timestamp?: string;
}

export interface LogCategoryUnknownChange {
  type: 'unknown';
  rawChange: string;
}

export interface LogCategoryHistogramBucket {
  documentCount: number;
  timestamp: string;
}
