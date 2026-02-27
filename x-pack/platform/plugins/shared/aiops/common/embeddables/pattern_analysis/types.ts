/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RandomSamplerOption, RandomSamplerProbability } from '@kbn/ml-random-sampler-utils';
import type { SerializedTimeRange } from '@kbn/presentation-publishing';
import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';

export type MinimumTimeRangeOption = 'No minimum' | '1 week' | '1 month' | '3 months' | '6 months';

export interface PatternAnalysisEmbeddableState extends SerializedTitles, SerializedTimeRange {
  dataViewId?: string;
  fieldName?: string;
  minimumTimeRangeOption: MinimumTimeRangeOption;
  randomSamplerMode: RandomSamplerOption;
  randomSamplerProbability: RandomSamplerProbability;
}

export type StoredPatternAnalysisEmbeddableState = Omit<
  PatternAnalysisEmbeddableState,
  'dataViewId'
>;
