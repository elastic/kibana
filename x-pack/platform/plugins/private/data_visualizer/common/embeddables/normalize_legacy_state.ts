/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldStatsEmbeddableState } from '@kbn/data-visualizer-server-schemas/embeddables/field_stats';

export interface LegacyFieldStatsFields {
  dataViewId?: string;
  viewType?: FieldStatsEmbeddableState['view_type'];
  showDistributions?: boolean;
}

export type RawFieldStatsState = Partial<FieldStatsEmbeddableState> & LegacyFieldStatsFields;

interface NormalizedFieldStatsFields {
  data_view_id: string | undefined;
  view_type: FieldStatsEmbeddableState['view_type'];
  query: FieldStatsEmbeddableState['query'];
  show_distributions: boolean;
}

export const normalizeFieldStatsLegacyFields = (
  state: RawFieldStatsState
): NormalizedFieldStatsFields => ({
  data_view_id: state.data_view_id ?? state.dataViewId,
  view_type: state.view_type ?? state.viewType ?? 'dataview',
  query: state.query,
  show_distributions: state.show_distributions ?? state.showDistributions ?? false,
});
