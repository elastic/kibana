/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type {
  PatternAnalysisComponentApi,
  PatternAnalysisEmbeddableRuntimeState,
  PatternAnalysisEmbeddableState,
} from './types';

type PatternAnalysisEmbeddableCustomState = Omit<
  PatternAnalysisEmbeddableState,
  'timeRange' | 'title' | 'description' | 'hidePanelTitles'
>;

export const initializePatternAnalysisControls = (state: PatternAnalysisEmbeddableRuntimeState) => {
  const dataViewId = new BehaviorSubject(state.dataViewId);
  const fieldName = new BehaviorSubject(state.fieldName);
  const minimumTimeRangeOption = new BehaviorSubject(state.minimumTimeRangeOption);
  const randomSamplerMode = new BehaviorSubject(state.randomSamplerMode);
  const randomSamplerProbability = new BehaviorSubject(state.randomSamplerProbability);

  const updateUserInput = (update: PatternAnalysisEmbeddableCustomState) => {
    dataViewId.next(update.dataViewId);
    fieldName.next(update.fieldName);
    minimumTimeRangeOption.next(update.minimumTimeRangeOption);
    randomSamplerMode.next(update.randomSamplerMode);
    randomSamplerProbability.next(update.randomSamplerProbability);
  };

  const serializePatternAnalysisChartState = (): PatternAnalysisEmbeddableCustomState => {
    return {
      dataViewId: dataViewId.getValue(),
      fieldName: fieldName.getValue(),
      minimumTimeRangeOption: minimumTimeRangeOption.getValue(),
      randomSamplerMode: randomSamplerMode.getValue(),
      randomSamplerProbability: randomSamplerProbability.getValue(),
    };
  };

  const patternAnalysisControlsComparators: StateComparators<PatternAnalysisEmbeddableCustomState> =
    {
      dataViewId: 'referenceEquality',
      fieldName: 'referenceEquality',
      minimumTimeRangeOption: 'referenceEquality',
      randomSamplerMode: 'referenceEquality',
      randomSamplerProbability: 'referenceEquality',
    };

  return {
    patternAnalysisControlsApi: {
      dataViewId,
      fieldName,
      minimumTimeRangeOption,
      randomSamplerMode,
      randomSamplerProbability,
      updateUserInput,
    } as unknown as PatternAnalysisComponentApi,
    serializePatternAnalysisChartState,
    patternAnalysisControlsComparators,
  };
};
