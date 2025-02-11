/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  HasEditCapabilities,
  PublishesDataViews,
  PublishesTimeRange,
  PublishingSubject,
  SerializedTimeRange,
  SerializedTitles,
} from '@kbn/presentation-publishing';

export interface ChangePointComponentApi {
  viewType: PublishingSubject<ChangePointEmbeddableState['viewType']>;
  dataViewId: PublishingSubject<ChangePointEmbeddableState['dataViewId']>;
  fn: PublishingSubject<ChangePointEmbeddableState['fn']>;
  metricField: PublishingSubject<ChangePointEmbeddableState['metricField']>;
  splitField: PublishingSubject<ChangePointEmbeddableState['splitField']>;
  partitions: PublishingSubject<ChangePointEmbeddableState['partitions']>;
  maxSeriesToPlot: PublishingSubject<ChangePointEmbeddableState['maxSeriesToPlot']>;
  updateUserInput: (update: ChangePointEmbeddableState) => void;
}

export type ChangePointEmbeddableApi = DefaultEmbeddableApi<ChangePointEmbeddableState> &
  HasEditCapabilities &
  PublishesDataViews &
  PublishesTimeRange &
  ChangePointComponentApi;

export interface ChangePointEmbeddableState extends SerializedTitles, SerializedTimeRange {
  viewType: ChangePointDetectionViewType;
  dataViewId: string;
  fn: 'avg' | 'sum' | 'min' | 'max' | string;
  metricField: string;
  splitField?: string;
  partitions?: string[];
  maxSeriesToPlot?: number;
}

export type ChangePointEmbeddableRuntimeState = ChangePointEmbeddableState;
