/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import { PATTERN_ANALYSIS_DATA_VIEW_REF_NAME } from '@kbn/aiops-log-pattern-analysis/constants';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import { flow } from 'lodash';
import {
  type LegacyPatternAnalysisFields,
  normalizePatternAnalysisLegacyFields,
} from './normalize_legacy_state';
import type { StoredPatternAnalysisEmbeddableState } from './types';

export function transformOut(
  storedState: StoredPatternAnalysisEmbeddableState,
  references?: Reference[]
): PatternAnalysisEmbeddableState {
  const transformsFlow = flow(
    transformTitlesOut<StoredPatternAnalysisEmbeddableState>,
    transformTimeRangeOut<StoredPatternAnalysisEmbeddableState>
  );
  const state = transformsFlow(storedState) as StoredPatternAnalysisEmbeddableState &
    LegacyPatternAnalysisFields;

  const normalized = normalizePatternAnalysisLegacyFields(state);
  const dataViewId =
    references?.find((ref) => ref.name === PATTERN_ANALYSIS_DATA_VIEW_REF_NAME)?.id ??
    normalized.data_view_id;

  if (!dataViewId) {
    throw new Error('Invalid pattern analysis embeddable state: missing data_view_id reference');
  }
  if (!normalized.field_name) {
    throw new Error('Invalid pattern analysis embeddable state: missing field_name');
  }

  const {
    dataViewId: _dataViewId,
    fieldName: _fieldName,
    minimumTimeRangeOption: _minimumTimeRangeOption,
    randomSamplerMode: _randomSamplerMode,
    randomSamplerProbability: _randomSamplerProbability,
    ...passthrough
  } = state;

  return {
    ...passthrough,
    data_view_id: dataViewId,
    field_name: normalized.field_name,
    minimum_time_range: normalized.minimum_time_range,
    random_sampler_mode: normalized.random_sampler_mode,
    random_sampler_probability: normalized.random_sampler_probability,
  };
}
