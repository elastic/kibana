/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_MINIMUM_TIME_RANGE,
  MINIMUM_TIME_RANGE_OPTION,
  type MinimumTimeRangeStoredOption,
} from '@kbn/aiops-log-pattern-analysis/constants';
import { RANDOM_SAMPLER_OPTION } from '@kbn/ml-random-sampler-utils';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import type { MinimumTimeRangeOption } from './types';

const UI_TO_STORED_MINIMUM_TIME_RANGE: Readonly<
  Record<MinimumTimeRangeOption, MinimumTimeRangeStoredOption>
> = {
  'No minimum': MINIMUM_TIME_RANGE_OPTION.NO_MINIMUM,
  '1 week': MINIMUM_TIME_RANGE_OPTION.ONE_WEEK,
  '1 month': MINIMUM_TIME_RANGE_OPTION.ONE_MONTH,
  '3 months': MINIMUM_TIME_RANGE_OPTION.THREE_MONTHS,
  '6 months': MINIMUM_TIME_RANGE_OPTION.SIX_MONTHS,
};

const STORED_MINIMUM_TIME_RANGE_OPTIONS = new Set<string>(Object.values(MINIMUM_TIME_RANGE_OPTION));

function isUiMinimumTimeRangeOption(
  minimumTimeRange: string
): minimumTimeRange is MinimumTimeRangeOption {
  return minimumTimeRange in UI_TO_STORED_MINIMUM_TIME_RANGE;
}

const STORED_TO_UI_MINIMUM_TIME_RANGE: Readonly<
  Record<MinimumTimeRangeStoredOption, MinimumTimeRangeOption>
> = {
  [MINIMUM_TIME_RANGE_OPTION.NO_MINIMUM]: 'No minimum',
  [MINIMUM_TIME_RANGE_OPTION.ONE_WEEK]: '1 week',
  [MINIMUM_TIME_RANGE_OPTION.ONE_MONTH]: '1 month',
  [MINIMUM_TIME_RANGE_OPTION.THREE_MONTHS]: '3 months',
  [MINIMUM_TIME_RANGE_OPTION.SIX_MONTHS]: '6 months',
};

export const toStoredMinimumTimeRange = (
  minimumTimeRange: string
): MinimumTimeRangeStoredOption => {
  if (STORED_MINIMUM_TIME_RANGE_OPTIONS.has(minimumTimeRange)) {
    return minimumTimeRange as MinimumTimeRangeStoredOption;
  }

  return isUiMinimumTimeRangeOption(minimumTimeRange)
    ? UI_TO_STORED_MINIMUM_TIME_RANGE[minimumTimeRange]
    : DEFAULT_MINIMUM_TIME_RANGE;
};

export const toUiMinimumTimeRange = (
  minimumTimeRange: MinimumTimeRangeStoredOption
): MinimumTimeRangeOption => {
  return STORED_TO_UI_MINIMUM_TIME_RANGE[minimumTimeRange];
};

// Pre-9.5 stored state used camelCase for these fields.
export interface LegacyPatternAnalysisFields {
  dataViewId?: string;
  fieldName?: string;
  minimumTimeRangeOption?: string;
  randomSamplerMode?: PatternAnalysisEmbeddableState['random_sampler_mode'];
  randomSamplerProbability?: PatternAnalysisEmbeddableState['random_sampler_probability'];
}

export type RawPatternAnalysisState = Partial<PatternAnalysisEmbeddableState> &
  LegacyPatternAnalysisFields;

interface NormalizedPatternAnalysisFields {
  data_view_id: string | undefined;
  field_name: string | undefined;
  minimum_time_range: PatternAnalysisEmbeddableState['minimum_time_range'];
  random_sampler_mode: PatternAnalysisEmbeddableState['random_sampler_mode'];
  random_sampler_probability: PatternAnalysisEmbeddableState['random_sampler_probability'];
}

export const normalizePatternAnalysisLegacyFields = (
  state: RawPatternAnalysisState
): NormalizedPatternAnalysisFields => {
  const rawMinimumTimeRange =
    state.minimum_time_range ?? state.minimumTimeRangeOption ?? DEFAULT_MINIMUM_TIME_RANGE;

  return {
    data_view_id: state.data_view_id ?? state.dataViewId,
    field_name: state.field_name ?? state.fieldName,
    minimum_time_range: toStoredMinimumTimeRange(rawMinimumTimeRange),
    random_sampler_mode:
      state.random_sampler_mode ?? state.randomSamplerMode ?? RANDOM_SAMPLER_OPTION.ON_AUTOMATIC,
    random_sampler_probability:
      state.random_sampler_probability !== undefined
        ? state.random_sampler_probability
        : state.randomSamplerProbability !== undefined
        ? state.randomSamplerProbability
        : null,
  };
};
