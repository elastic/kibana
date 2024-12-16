/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTermsAggConfig } from './terms_agg';
import { getPercentilesAggConfig } from './percentiles_agg';
import type { PivotSupportedAggs } from '../../../../../../../common/types/pivot_aggs';
import { PIVOT_SUPPORTED_AGGS } from '../../../../../../../common/types/pivot_aggs';

import type {
  PivotAggsConfigBase,
  PivotAggsConfigWithUiBase,
} from '../../../../../common/pivot_aggs';
import { getFilterAggConfig } from './filter_agg/config';
import { getTopMetricsAggConfig } from './top_metrics_agg';

/**
 * Gets form configuration for provided aggregation type.
 */
export function getAggFormConfig(
  agg: PivotSupportedAggs | string,
  commonConfig: PivotAggsConfigBase | PivotAggsConfigWithUiBase
) {
  switch (agg) {
    case PIVOT_SUPPORTED_AGGS.FILTER:
      return getFilterAggConfig(commonConfig);
    case PIVOT_SUPPORTED_AGGS.TOP_METRICS:
      return getTopMetricsAggConfig(commonConfig);
    case PIVOT_SUPPORTED_AGGS.PERCENTILES:
      return getPercentilesAggConfig(commonConfig);
    case PIVOT_SUPPORTED_AGGS.TERMS:
      return getTermsAggConfig(commonConfig);
    default:
      return commonConfig;
  }
}
