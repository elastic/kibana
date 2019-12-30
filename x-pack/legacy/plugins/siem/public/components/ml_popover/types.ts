/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlError } from '../ml/types';

export interface Group {
  id: string;
  jobIds: string[];
  calendarIds: string[];
}

export interface CheckRecognizerProps {
  indexPatternName: string[];
  kbnVersion: string;
  signal: AbortSignal;
}

export interface RecognizerModule {
  id: string;
  title: string;
  query: Record<string, object>;
  description: string;
  logo: {
    icon: string;
  };
}

export interface GetModulesProps {
  moduleId?: string;
  kbnVersion: string;
  signal: AbortSignal;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  type: string;
  logoFile: string;
  defaultIndexPattern: string;
  query: Record<string, object>;
  jobs: ModuleJob[];
  datafeeds: ModuleDatafeed[];
  kibana: object;
}

/**
 * Representation of an ML Job as returned from `the ml/modules/get_module` API
 */
export interface ModuleJob {
  id: string;
  config: {
    groups: string[];
    description: string;
    analysis_config: {
      bucket_span: string;
      summary_count_field_name?: string;
      detectors: Detector[];
      influencers: string[];
    };
    analysis_limits: {
      model_memory_limit: string;
    };
    data_description: {
      time_field: string;
      time_format?: string;
    };
    model_plot_config?: {
      enabled: boolean;
    };
    custom_settings: {
      created_by: string;
      custom_urls: CustomURL[];
    };
    job_type: string;
  };
}

// TODO: Speak to ML team about why the get_module API will sometimes return indexes and other times indices
// See mockGetModuleResponse for examples
export interface ModuleDatafeed {
  id: string;
  config: {
    job_id: string;
    indexes?: string[];
    indices?: string[];
    query: Record<string, object>;
  };
}

export interface MlSetupArgs {
  configTemplate: string;
  indexPatternName: string;
  jobIdErrorFilter: string[];
  groups: string[];
  prefix?: string;
  kbnVersion: string;
}

/**
 * Representation of an ML Job as returned from the `ml/jobs/jobs_summary` API
 */
export interface JobSummary {
  datafeedId: string;
  datafeedIndices: string[];
  datafeedState: string;
  description: string;
  earliestTimestampMs?: number;
  latestResultsTimestampMs?: number;
  groups: string[];
  hasDatafeed: boolean;
  id: string;
  isSingleMetricViewerJob: boolean;
  jobState: string;
  latestTimestampMs?: number;
  memory_status: string;
  nodeName?: string;
  processed_record_count: number;
}

export interface Detector {
  detector_description: string;
  function: string;
  by_field_name: string;
  partition_field_name?: string;
}

export interface CustomURL {
  url_name: string;
  url_value: string;
}

/**
 * Representation of an ML Job as used by the SIEM App -- a composition of ModuleJob and JobSummary
 * that includes necessary metadata like moduleName, defaultIndexPattern, etc.
 */
export interface SiemJob extends JobSummary {
  moduleId: string;
  defaultIndexPattern: string;
  isCompatible: boolean;
  isInstalled: boolean;
  isElasticJob: boolean;
}

export interface AugmentedSiemJobFields {
  moduleId: string;
  defaultIndexPattern: string;
  isCompatible: boolean;
  isElasticJob: boolean;
}

export interface SetupMlResponseJob {
  id: string;
  success: boolean;
  error?: MlError;
}

export interface SetupMlResponseDatafeed {
  id: string;
  success: boolean;
  started: boolean;
  error?: MlError;
}

export interface SetupMlResponse {
  jobs: SetupMlResponseJob[];
  datafeeds: SetupMlResponseDatafeed[];
  kibana: {};
}

export interface StartDatafeedResponse {
  [key: string]: {
    started: boolean;
    error?: string;
  };
}

export interface ErrorResponse {
  statusCode?: number;
  error?: string;
  message?: string;
}

export interface StopDatafeedResponse {
  [key: string]: {
    stopped: boolean;
  };
}

export interface CloseJobsResponse {
  [key: string]: {
    closed: boolean;
  };
}

export interface IndexPatternSavedObject {
  attributes: {
    title: string;
  };
  id: string;
  type: string;
  updated_at: string;
  version: string;
}

export interface JobsFilters {
  filterQuery: string;
  showCustomJobs: boolean;
  showElasticJobs: boolean;
  selectedGroups: string[];
}
