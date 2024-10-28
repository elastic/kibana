/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { RefreshInterval, TimeRange } from '@kbn/data-plugin/common/query';
import type { DataFrameAnalysisConfigType } from '@kbn/ml-data-frame-analytics-utils';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import type { ListingPageUrlState } from '@kbn/ml-url-state';

import type { SeverityThreshold } from './anomalies';
import type { JobId } from './anomaly_detection_jobs/job';

export const ML_APP_LOCATOR = 'ML_APP_LOCATOR';

/**
 * @deprecated since 9.1, kept here to redirect old bookmarks
 */
export const DEPRECATED_ML_ROUTE_TO_NEW_ROUTE = {
  jobs: 'anomaly_detection',
  data_frame_analytics: 'analytics',
  trained_models: 'trained_models',
  notifications: 'overview?_g=(tab:notifications)&',
  memory_usage: 'overview',
  supplied_configurations: 'anomaly_detection/ad_supplied_configurations',
  settings: 'ad_settings',
  'settings/calendars_list': 'ad_settings/calendars_list',
  'settings/calendars_list/new_calendar': 'ad_settings/calendars_list/new_calendar',
  'settings/calendars_dst_list': 'ad_settings/calendars_dst_list',
  'settings/calendars_dst_list/new_calendar': 'ad_settings/calendars_dst_list/new_calendar',
  'settings/filter_lists': 'ad_settings/filter_lists',
  'settings/filter_lists/new_filter_list': 'ad_settings/filter_lists/new_filter_list',
  nodes: 'overview',
  'jobs/new_job/step/index_or_search': 'anomaly_detection/jobs/new_job/step/select_source',
};

export const ML_PAGES = {
  ANOMALY_DETECTION_JOBS_MANAGE: '',
  ANOMALY_DETECTION_JOBS_MANAGE_FOR_URL: 'jobs',
  ANOMALY_EXPLORER: 'explorer',
  SINGLE_METRIC_VIEWER: 'timeseriesexplorer',
  DATA_FRAME_ANALYTICS_JOBS_MANAGE: '',
  DATA_FRAME_ANALYTICS_JOBS_MANAGE_FOR_URL: 'data_frame_analytics',
  DATA_FRAME_ANALYTICS_SOURCE_SELECTION: 'data_frame_analytics/source_selection',
  DATA_FRAME_ANALYTICS_CREATE_JOB: 'data_frame_analytics/new_job',
  TRAINED_MODELS_MANAGE: 'trained_models',
  DATA_DRIFT_INDEX_SELECT: 'data_drift_index_select',
  DATA_DRIFT_CUSTOM: 'data_drift_custom',
  DATA_DRIFT: 'data_drift',
  NODES: 'nodes',
  MEMORY_USAGE: 'memory_usage',
  DATA_FRAME_ANALYTICS_EXPLORATION: 'data_frame_analytics/exploration',
  DATA_FRAME_ANALYTICS_MAP: 'data_frame_analytics/map',
  SUPPLIED_CONFIGURATIONS: 'ad_supplied_configurations',
  /**
   * Page: Data Visualizer
   */
  DATA_VISUALIZER: 'datavisualizer',
  /**
   * Page: Data Visualizer
   * Open data visualizer by selecting a Kibana data view or saved search
   */
  DATA_VISUALIZER_INDEX_SELECT: 'datavisualizer_index_select',
  /**
   * Page: Data Visualizer
   * Open data visualizer by importing data from a log file
   */
  DATA_VISUALIZER_FILE: 'filedatavisualizer',
  /**
   * Page: Data Visualizer
   * Open index data visualizer viewer page
   */
  DATA_VISUALIZER_ESQL: 'datavisualizer/esql',
  DATA_VISUALIZER_INDEX_VIEWER: 'jobs/new_job/datavisualizer',
  ANOMALY_DETECTION_CREATE_JOB: 'jobs/new_job',
  ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER: 'jobs/new_job/recognize',
  ANOMALY_DETECTION_CREATE_JOB_SINGLE_METRIC: 'jobs/new_job/single_metric',
  ANOMALY_DETECTION_CREATE_JOB_MULTI_METRIC: 'jobs/new_job/multi_metric',
  ANOMALY_DETECTION_CREATE_JOB_CONVERT_TO_MULTI_METRIC: 'jobs/new_job/convert_to_multi_metric',
  ANOMALY_DETECTION_CREATE_JOB_ADVANCED: 'jobs/new_job/advanced',
  ANOMALY_DETECTION_CREATE_JOB_POPULATION: 'jobs/new_job/population',
  ANOMALY_DETECTION_CREATE_JOB_CATEGORIZATION: 'jobs/new_job/categorization',
  ANOMALY_DETECTION_CREATE_JOB_RARE: 'jobs/new_job/rare',
  ANOMALY_DETECTION_CREATE_JOB_GEO: 'jobs/new_job/geo',
  ANOMALY_DETECTION_CREATE_JOB_CONVERT_TO_ADVANCED: 'jobs/new_job/advanced',
  ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE: 'jobs/new_job/step/job_type',
  ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX: 'jobs/new_job/step/select_source',
  ANOMALY_DETECTION_CREATE_JOB_FROM_LENS: 'jobs/new_job/from_lens',
  ANOMALY_DETECTION_CREATE_JOB_FROM_PATTERN_ANALYSIS: 'jobs/new_job/from_pattern_analysis',
  ANOMALY_DETECTION_CREATE_JOB_FROM_MAP: 'jobs/new_job/from_map',
  ANOMALY_DETECTION_MODULES_VIEW_OR_CREATE: 'modules/check_view_or_create',
  SETTINGS: '',
  CALENDARS_MANAGE: 'calendars_list',
  CALENDARS_DST_MANAGE: 'calendars_dst_list',
  CALENDARS_NEW: 'calendars_list/new_calendar',
  CALENDARS_DST_NEW: 'calendars_dst_list/new_calendar',
  CALENDARS_EDIT: 'calendars_list/edit_calendar',
  CALENDARS_DST_EDIT: 'calendars_dst_list/edit_calendar',
  FILTER_LISTS_MANAGE: 'filter_lists',
  FILTER_LISTS_NEW: 'filter_lists/new_filter_list',
  FILTER_LISTS_EDIT: 'filter_lists/edit_filter_list',
  OVERVIEW: 'overview',
  NOTIFICATIONS: 'notifications',
  AIOPS: 'aiops',
  /**
   * @deprecated since 8.10, kept here to redirect old bookmarks.
   */
  AIOPS_EXPLAIN_LOG_RATE_SPIKES: 'aiops/explain_log_rate_spikes',
  /**
   * @deprecated since 8.10, kept here to redirect old bookmarks.
   */
  AIOPS_EXPLAIN_LOG_RATE_SPIKES_INDEX_SELECT: 'aiops/explain_log_rate_spikes_index_select',
  AIOPS_LOG_RATE_ANALYSIS: 'aiops/log_rate_analysis',
  AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT: 'aiops/log_rate_analysis_index_select',
  AIOPS_LOG_CATEGORIZATION: 'aiops/log_categorization',
  AIOPS_LOG_CATEGORIZATION_INDEX_SELECT: 'aiops/log_categorization_index_select',
  AIOPS_CHANGE_POINT_DETECTION: 'aiops/change_point_detection',
  AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT: 'aiops/change_point_detection_index_select',
} as const;

export type MlPages = (typeof ML_PAGES)[keyof typeof ML_PAGES];

type OptionalPageState = (object & { globalState?: MlCommonGlobalState }) | undefined;

export type MLPageState<PageType, PageState> = PageState extends OptionalPageState
  ? { page: PageType; pageState?: PageState }
  : PageState extends object
  ? { page: PageType; pageState: PageState }
  : { page: PageType };

export interface MlCommonGlobalState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
}
export interface MlCommonAppState {
  [key: string]: any;
}

export interface MlIndexBasedSearchState {
  index?: string;
  savedSearchId?: string;
}

export interface MlGenericUrlPageState extends MlIndexBasedSearchState {
  globalState?: MlCommonGlobalState;
  appState?: MlCommonAppState;
  [key: string]: any;
}

export type MlGenericUrlState = MLPageState<
  | typeof ML_PAGES.AIOPS
  | typeof ML_PAGES.AIOPS_LOG_CATEGORIZATION
  | typeof ML_PAGES.AIOPS_LOG_CATEGORIZATION_INDEX_SELECT
  | typeof ML_PAGES.AIOPS_LOG_RATE_ANALYSIS
  | typeof ML_PAGES.AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT
  | typeof ML_PAGES.AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT
  | typeof ML_PAGES.AIOPS_CHANGE_POINT_DETECTION
  | typeof ML_PAGES.ANOMALY_EXPLORER
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_LENS
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_MAP
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_PATTERN_ANALYSIS
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE
  | typeof ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX
  | typeof ML_PAGES.CALENDARS_DST_MANAGE
  | typeof ML_PAGES.CALENDARS_DST_NEW
  | typeof ML_PAGES.CALENDARS_MANAGE
  | typeof ML_PAGES.CALENDARS_NEW
  | typeof ML_PAGES.DATA_DRIFT_CUSTOM
  | typeof ML_PAGES.DATA_DRIFT_INDEX_SELECT
  | typeof ML_PAGES.DATA_DRIFT
  | typeof ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB
  | typeof ML_PAGES.DATA_FRAME_ANALYTICS_SOURCE_SELECTION
  | typeof ML_PAGES.DATA_VISUALIZER
  | typeof ML_PAGES.DATA_VISUALIZER_FILE
  | typeof ML_PAGES.DATA_VISUALIZER_INDEX_SELECT
  | typeof ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER
  | typeof ML_PAGES.DATA_VISUALIZER_ESQL
  | typeof ML_PAGES.FILTER_LISTS_MANAGE
  | typeof ML_PAGES.FILTER_LISTS_NEW
  | typeof ML_PAGES.SETTINGS
  | typeof ML_PAGES.SINGLE_METRIC_VIEWER
  | typeof ML_PAGES.SUPPLIED_CONFIGURATIONS
  | typeof ML_PAGES.OVERVIEW,
  MlGenericUrlPageState | undefined
>;
export interface AnomalyDetectionQueryState {
  jobId?: JobId | string[];
  groupIds?: string[];
  globalState?: MlCommonGlobalState;
}

export type AnomalyDetectionUrlState = MLPageState<
  typeof ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  AnomalyDetectionQueryState | undefined
>;

export type AnomalyExplorerSwimLaneUrlState = ExplorerAppState['mlExplorerSwimlane'];

export type AnomalyExplorerFilterUrlState = ExplorerAppState['mlExplorerFilter'];

export interface ExplorerAppState {
  mlExplorerSwimlane: {
    selectedType?: 'overall' | 'viewBy';
    selectedLanes?: string[];
    /**
     * @deprecated legacy query param variable, use `selectedLanes`
     */
    selectedLane?: string[] | string;
    /**
     * It's possible to have only "from" time boundaries, e.g. in the Watcher URL
     */
    selectedTimes?: [number, number] | number;
    /**
     * @deprecated legacy query param variable, use `selectedTimes`
     */
    selectedTime?: [number, number] | number;
    showTopFieldValues?: boolean;
    viewByFieldName?: string;
    viewByPerPage?: number;
    viewByFromPage?: number;
    /**
     * Indicated severity threshold for both swim lanes
     */
    severity?: SeverityThreshold[];
  };
  mlExplorerFilter: {
    influencersFilterQuery?: InfluencersFilterQuery;
    filterActive?: boolean;
    filteredFields?: Array<string | number>;
    queryString?: string;
  };
  query?: any;
  mlShowCharts?: boolean;
}

export interface ExplorerGlobalState {
  ml: { jobIds: JobId[] };
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
}

export interface ExplorerUrlPageState {
  /**
   * Job IDs
   */
  jobIds?: JobId[];
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;
  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval;
  /**
   * Optionally set the query.
   */
  query?: any;
  /**
   * Optional state for the swim lane
   */
  mlExplorerSwimlane?: ExplorerAppState['mlExplorerSwimlane'];
  mlExplorerFilter?: ExplorerAppState['mlExplorerFilter'];
  globalState?: MlCommonGlobalState;
}

export type ExplorerUrlState = MLPageState<typeof ML_PAGES.ANOMALY_EXPLORER, ExplorerUrlPageState>;

export interface TimeSeriesExplorerGlobalState {
  ml: {
    jobIds: JobId[];
  };
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
}

export interface TimeSeriesExplorerParams {
  forecastId?: string;
  detectorIndex?: number;
  entities?: Record<string, string>;
  zoom?: {
    from?: string;
    to?: string;
  };
  functionDescription?: string;
}
export interface TimeSeriesExplorerAppState {
  mlTimeSeriesExplorer?: TimeSeriesExplorerParams;
  query?: any;
}

export interface TimeSeriesExplorerPageState
  extends TimeSeriesExplorerParams,
    Pick<TimeSeriesExplorerAppState, 'query'>,
    Pick<TimeSeriesExplorerGlobalState, 'refreshInterval'> {
  jobIds?: JobId[];
  timeRange?: TimeRange;
  globalState?: MlCommonGlobalState;
}

export type TimeSeriesExplorerUrlState = MLPageState<
  typeof ML_PAGES.SINGLE_METRIC_VIEWER,
  TimeSeriesExplorerPageState
>;

export interface DataFrameAnalyticsQueryState {
  analysisType?: DataFrameAnalysisConfigType;
  jobId?: JobId | JobId[];
  modelId?: string;
  groupIds?: string[];
  globalState?: MlCommonGlobalState;
}

export interface TrainedModelsQueryState {
  modelId?: string;
}

export interface MemoryUsageNodesQueryState {
  nodeId?: string;
}

export type DataFrameAnalyticsUrlState = MLPageState<
  | typeof ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE
  | typeof ML_PAGES.DATA_FRAME_ANALYTICS_MAP
  | typeof ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB,
  DataFrameAnalyticsQueryState | undefined
>;

export interface DataFrameAnalyticsExplorationQueryState {
  ml: {
    jobId: JobId;
    analysisType: DataFrameAnalysisConfigType;
    defaultIsTraining?: boolean;
    modelId?: string;
  };
}

export type DataFrameAnalyticsExplorationUrlState = MLPageState<
  typeof ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
  {
    jobId: JobId;
    analysisType: DataFrameAnalysisConfigType;
    globalState?: MlCommonGlobalState;
    queryText?: string;
    modelId?: string;
  }
>;

export type CalendarEditUrlState = MLPageState<
  typeof ML_PAGES.CALENDARS_EDIT,
  {
    calendarId: string;
    globalState?: MlCommonGlobalState;
  }
>;

export type CalendarDstEditUrlState = MLPageState<
  typeof ML_PAGES.CALENDARS_DST_EDIT,
  {
    calendarId: string;
    globalState?: MlCommonGlobalState;
  }
>;

export type FilterEditUrlState = MLPageState<
  typeof ML_PAGES.FILTER_LISTS_EDIT,
  {
    filterId: string;
    globalState?: MlCommonGlobalState;
  }
>;

export type ExpandablePanels =
  | 'analysis'
  | 'evaluation'
  | 'feature_importance'
  | 'results'
  | 'splom';

export type ExplorationPageUrlState = {
  queryText: string;
  queryLanguage: SearchQueryLanguage;
} & Pick<ListingPageUrlState, 'pageIndex' | 'pageSize'> & { [key in ExpandablePanels]: boolean };

/**
 * Union type of ML URL state based on page
 */
export type MlLocatorState =
  | AnomalyDetectionUrlState
  | ExplorerUrlState
  | TimeSeriesExplorerUrlState
  | DataFrameAnalyticsUrlState
  | DataFrameAnalyticsExplorationUrlState
  | CalendarEditUrlState
  | CalendarDstEditUrlState
  | FilterEditUrlState
  | MlGenericUrlState
  | NotificationsUrlState
  | TrainedModelsUrlState
  | MemoryUsageUrlState
  | ChangePointDetectionUrlState;

export type MlLocatorParams = MlLocatorState & SerializableRecord;

export type MlLocator = LocatorPublic<MlLocatorParams>;

export type TrainedModelsUrlState = MLPageState<
  typeof ML_PAGES.TRAINED_MODELS_MANAGE,
  TrainedModelsQueryState | undefined
>;

export type MemoryUsageUrlState = MLPageState<
  typeof ML_PAGES.MEMORY_USAGE,
  MemoryUsageNodesQueryState | undefined
>;

export interface NotificationsQueryState {
  level: string;
}

export type NotificationsUrlState = MLPageState<
  typeof ML_PAGES.NOTIFICATIONS,
  NotificationsQueryState | undefined
>;

export interface ChangePointDetectionQueryState {
  index: string;
  timeRange?: TimeRange;
  fieldConfigs: Array<{
    fn: string;
    splitField?: string;
    metricField: string;
  }>;
}

export type ChangePointDetectionUrlState = MLPageState<
  typeof ML_PAGES.AIOPS_CHANGE_POINT_DETECTION,
  ChangePointDetectionQueryState
>;
