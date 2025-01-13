/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

/** Log rate analysis settings */
export const LOG_RATE_ANALYSIS_SETTINGS = {
  /**
   * The p-value threshold to be used for statistically significant items.
   */
  P_VALUE_THRESHOLD: 0.02,
  /**
   * The minimum support value to be used for the frequent item sets aggration.
   */
  FREQUENT_ITEMS_SETS_MINIMUM_SUPPORT: 0.001,
  /**
   * The maximum values per field to be used for the frequent item sets aggration.
   */
  FREQUENT_ITEMS_SETS_FIELD_VALUE_LIMIT: 50,
  /**
   * The number of terms by field to fetch for the zero docs fallback analysis.
   */
  TOP_TERMS_FALLBACK_SIZE: 100,
} as const;

/**
 * For the technical preview of Log Rate Analysis we use a hard coded seed.
 * In future versions we might use a user specific seed or let the user customise it.
 */
export const RANDOM_SAMPLER_SEED = 3867412;

/** Highlighting color for charts */
export const useLogRateAnalysisBarColors = () => {
  const { euiTheme } = useEuiTheme();
  return {
    barColor: euiTheme.flags.hasVisColorAdjustment
      ? euiTheme.colors.vis.euiColorVis0
      : euiTheme.colors.vis.euiColorVis0,
    barHighlightColor: euiTheme.flags.hasVisColorAdjustment
      ? 'orange'
      : euiTheme.colors.vis.euiColorVis8,
  };
};

/**  */
export const EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE = 'aiopsLogRateAnalysisEmbeddable' as const;

/**  */
export const LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME = 'aiopsLogRateAnalysisEmbeddableDataViewId';

export const CASES_ATTACHMENT_LOG_RATE_ANALYSIS = 'aiopsLogRateAnalysisEmbeddable';
