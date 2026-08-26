/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import type { PatternAnalysisComponentApi } from './types';

type PatternAnalysisState = Pick<
  PatternAnalysisEmbeddableState,
  | 'data_view_id'
  | 'field_name'
  | 'minimum_time_range'
  | 'random_sampler_mode'
  | 'random_sampler_probability'
>;

export const initializePatternAnalysisControls = (state: PatternAnalysisEmbeddableState) => {
  const dataViewId = new BehaviorSubject(state.data_view_id);
  const fieldName = new BehaviorSubject(state.field_name);
  const minimumTimeRangeOption = new BehaviorSubject(state.minimum_time_range);
  const randomSamplerMode = new BehaviorSubject(state.random_sampler_mode);
  const randomSamplerProbability = new BehaviorSubject(state.random_sampler_probability);

  const updateUserInput = (update: PatternAnalysisEmbeddableState) => {
    dataViewId.next(update.data_view_id);
    fieldName.next(update.field_name);
    minimumTimeRangeOption.next(update.minimum_time_range);
    randomSamplerMode.next(update.random_sampler_mode);
    randomSamplerProbability.next(update.random_sampler_probability);
  };

  const serializePatternAnalysisChartState = (): PatternAnalysisState => {
    return {
      data_view_id: dataViewId.getValue(),
      field_name: fieldName.getValue(),
      minimum_time_range: minimumTimeRangeOption.getValue(),
      random_sampler_mode: randomSamplerMode.getValue(),
      random_sampler_probability: randomSamplerProbability.getValue(),
    };
  };

  const patternAnalysisControlsComparators: StateComparators<PatternAnalysisState> = {
    data_view_id: 'referenceEquality',
    field_name: 'referenceEquality',
    minimum_time_range: 'referenceEquality',
    random_sampler_mode: 'referenceEquality',
    random_sampler_probability: 'referenceEquality',
  };

  const patternAnalysisControlsApi: PatternAnalysisComponentApi = {
    dataViewId,
    fieldName,
    minimumTimeRangeOption,
    randomSamplerMode,
    randomSamplerProbability,
    updateUserInput,
  };

  return {
    patternAnalysisControlsApi,
    serializePatternAnalysisChartState,
    patternAnalysisControlsComparators,
  };
};
