/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { flow } from 'lodash';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import type { FieldStatsEmbeddableState } from '@kbn/data-visualizer-server-schemas/embeddables/field_stats';
import type { StoredFieldStatisticsTableEmbeddableState } from './types';
import { FIELD_STATS_DATA_VIEW_REF_NAME } from './constants';
import {
  type LegacyFieldStatsFields,
  normalizeFieldStatsLegacyFields,
} from './normalize_legacy_state';

export function transformOut(
  storedState: StoredFieldStatisticsTableEmbeddableState,
  references?: Reference[]
): FieldStatsEmbeddableState {
  const transformsFlow = flow(
    transformTitlesOut<StoredFieldStatisticsTableEmbeddableState>,
    transformTimeRangeOut<StoredFieldStatisticsTableEmbeddableState>
  );
  const state = transformsFlow(storedState) as StoredFieldStatisticsTableEmbeddableState &
    LegacyFieldStatsFields;

  const normalized = normalizeFieldStatsLegacyFields(state);
  const dataViewId =
    references?.find((ref) => ref.name === FIELD_STATS_DATA_VIEW_REF_NAME)?.id ??
    normalized.data_view_id;

  const {
    dataViewId: _dataViewId,
    viewType: _viewType,
    showDistributions: _showDistributions,
    ...passthrough
  } = state;

  return {
    ...passthrough,
    ...(dataViewId ? { data_view_id: dataViewId } : {}),
    view_type: normalized.view_type,
    query: normalized.query,
    show_distributions: normalized.show_distributions,
  };
}
