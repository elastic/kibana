/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ANOMALY_SWIMLANE_EMBEDDABLE_TYPE = 'ml_anomaly_swimlane' as const;
export const ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE = 'ml_anomaly_charts' as const;
export const ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE = 'ml_single_metric_viewer' as const;

export type AnomalySwimLaneEmbeddableType = typeof ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;
export type AnomalyExplorerChartsEmbeddableType = typeof ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE;
export type AnomalySingleMetricViewerEmbeddableType =
  typeof ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE;

export type MlEmbeddableTypes =
  | AnomalySwimLaneEmbeddableType
  | AnomalyExplorerChartsEmbeddableType
  | AnomalySingleMetricViewerEmbeddableType;
