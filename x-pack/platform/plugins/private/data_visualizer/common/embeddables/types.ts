/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldStatsEmbeddableState } from '@kbn/data-visualizer-server-schemas/embeddables/field_stats';

export type { FieldStatsEmbeddableState, FieldStatsViewType } from '@kbn/data-visualizer-server-schemas/embeddables/field_stats';

export enum FieldStatsInitializerViewType {
  DATA_VIEW = 'dataview',
  ESQL = 'esql',
}

export interface FieldStatsInitialState {
  data_view_id?: string;
  view_type?: FieldStatsEmbeddableState['view_type'];
  query?: FieldStatsEmbeddableState['query'];
  show_distributions?: boolean;
}

export type FieldStatisticsTableEmbeddableState = FieldStatsEmbeddableState;

export type StoredFieldStatisticsTableEmbeddableState = Omit<
  FieldStatsEmbeddableState,
  'data_view_id'
>;
