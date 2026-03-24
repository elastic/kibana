/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  HasEditCapabilities,
  PublishesDataViews,
  PublishesTimeRange,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { PatternAnalysisEmbeddableState } from '../../../common/embeddables/pattern_analysis/types';

export interface PatternAnalysisComponentApi {
  dataViewId: PublishingSubject<PatternAnalysisEmbeddableState['dataViewId']>;
  fieldName: PublishingSubject<PatternAnalysisEmbeddableState['fieldName']>;
  minimumTimeRangeOption: PublishingSubject<
    PatternAnalysisEmbeddableState['minimumTimeRangeOption']
  >;
  randomSamplerMode: PublishingSubject<PatternAnalysisEmbeddableState['randomSamplerMode']>;
  randomSamplerProbability: PublishingSubject<
    PatternAnalysisEmbeddableState['randomSamplerProbability']
  >;
  updateUserInput: (update: PatternAnalysisEmbeddableState) => void;
}

export type PatternAnalysisEmbeddableApi = DefaultEmbeddableApi<PatternAnalysisEmbeddableState> &
  HasEditCapabilities &
  PublishesDataViews &
  PublishesTimeRange &
  PatternAnalysisComponentApi;
