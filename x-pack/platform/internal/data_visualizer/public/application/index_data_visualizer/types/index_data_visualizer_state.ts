/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { Query } from '@kbn/data-plugin/common/query';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import type { FieldVisConfig } from '../../../../common/types/field_vis_config';
import type { RandomSamplerOption } from '../constants/random_sampler';

import type { DATA_VISUALIZER_INDEX_VIEWER } from '../constants/index_data_visualizer_viewer';
import type { OverallStats } from './overall_stats';

export interface DataVisualizerIndexBasedPageUrlState {
  pageKey: typeof DATA_VISUALIZER_INDEX_VIEWER;
  pageUrlState: Required<DataVisualizerIndexBasedAppState>;
}

export interface DataVisualizerPageState {
  overallStats: OverallStats;
  metricConfigs: FieldVisConfig[];
  totalMetricFieldCount: number;
  populatedMetricFieldCount: number;
  metricsLoaded: boolean;
  nonMetricConfigs: FieldVisConfig[];
  nonMetricsLoaded: boolean;
  documentCountStats?: FieldVisConfig;
}

export interface ListingPageUrlState {
  pageSize: number;
  pageIndex: number;
  sortField: string;
  sortDirection: string;
  queryText?: string;
}

export interface DataVisualizerIndexBasedAppState extends Omit<ListingPageUrlState, 'queryText'> {
  searchString?: Query['query'];
  searchQuery?: Query['query'];
  searchQueryLanguage?: SearchQueryLanguage;
  visibleFieldTypes?: string[];
  visibleFieldNames?: string[];
  showDistributions?: boolean;
  showAllFields?: boolean;
  showEmptyFields?: boolean;
  filters?: Filter[];
  probability?: number | null;
  rndSamplerPref?: RandomSamplerOption;
}
