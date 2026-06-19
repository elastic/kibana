/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnomalyExplorerChartsEmbeddableType } from '@kbn/ml-common-types/embeddables/anomaly_charts';
import type { AnomalySwimLaneEmbeddableType } from '@kbn/ml-common-types/embeddables/anomaly_swimlane';
import type { AnomalySingleMetricViewerEmbeddableType } from '@kbn/ml-common-types/embeddables/single_metric_viewer';

export type MlEmbeddableTypes =
  | AnomalySwimLaneEmbeddableType
  | AnomalyExplorerChartsEmbeddableType
  | AnomalySingleMetricViewerEmbeddableType;
