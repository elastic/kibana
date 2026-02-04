/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { SerializedTimeRange } from '@kbn/presentation-publishing';
import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';

export enum FieldStatsInitializerViewType {
  DATA_VIEW = 'dataview',
  ESQL = 'esql',
}

export interface FieldStatsInitialState {
  dataViewId?: string;
  viewType?: FieldStatsInitializerViewType;
  query?: AggregateQuery;
  showDistributions?: boolean;
}
export type FieldStatisticsTableEmbeddableState = FieldStatsInitialState &
  SerializedTitles &
  SerializedTimeRange & {};

export type StoredFieldStatisticsTableEmbeddableState = Omit<
  FieldStatisticsTableEmbeddableState,
  'dataViewId'
>;
