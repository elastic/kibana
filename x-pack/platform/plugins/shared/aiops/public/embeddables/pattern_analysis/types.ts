/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  HasEditCapabilities,
  PublishesDataSources,
  PublishesTimeRange,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';

export interface PatternAnalysisComponentApi {
  dataViewId: PublishingSubject<PatternAnalysisEmbeddableState['data_view_id']>;
  fieldName: PublishingSubject<PatternAnalysisEmbeddableState['field_name']>;
  minimumTimeRangeOption: PublishingSubject<PatternAnalysisEmbeddableState['minimum_time_range']>;
  randomSamplerMode: PublishingSubject<PatternAnalysisEmbeddableState['random_sampler_mode']>;
  randomSamplerProbability: PublishingSubject<
    PatternAnalysisEmbeddableState['random_sampler_probability']
  >;
  updateUserInput: (update: PatternAnalysisEmbeddableState) => void;
}

export type PatternAnalysisEmbeddableApi = DefaultEmbeddableApi<PatternAnalysisEmbeddableState> &
  HasEditCapabilities &
  PublishesDataSources<DataView> &
  PublishesTimeRange &
  PatternAnalysisComponentApi;
