/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface LensVisualizationUsage {
  visualization_types_overall: Record<string, number>;
  visualization_types_last_30_days: Record<string, number>;
  visualization_types_last_90_days: Record<string, number>;
  saved_total: number;
  saved_last_30_days: number;
  saved_last_90_days: number;
}

export interface LensClickUsage {
  clicks_last_30_days: Record<string, number>;
  clicks_last_90_days: Record<string, number>;
  suggestion_clicks_last_30_days: Record<string, number>;
  suggestion_clicks_last_90_days: Record<string, number>;
}

export type LensUsage = LensVisualizationUsage & LensClickUsage;