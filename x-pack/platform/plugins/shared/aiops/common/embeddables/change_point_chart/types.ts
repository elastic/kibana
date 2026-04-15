/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { SerializedTimeRange } from '@kbn/presentation-publishing';
import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';

interface ChangePointCommonState extends SerializedTimeRange {
  viewType: ChangePointDetectionViewType;
  fn: 'avg' | 'sum' | 'min' | 'max' | string;
  metricField: string;
  splitField?: string;
  partitions?: string[];
  maxSeriesToPlot?: number;
}

export type ChangePointEmbeddableState = ChangePointCommonState &
  SerializedTitles & { dataViewId: string };

export type StoredChangePointEmbeddableState = Omit<ChangePointEmbeddableState, 'dataViewId'>;
