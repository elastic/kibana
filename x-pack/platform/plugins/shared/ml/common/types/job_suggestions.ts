/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { JOB_TYPE } from '../constants/new_job';

/** The body of a create job request, ready to be sent to the ML API. */
export interface SuggestedJobConfig {
  job_id: string;
  description: string;
  analysis_config: estypes.MlAnalysisConfig;
  data_description: estypes.MlDataDescription;
  analysis_limits?: estypes.MlAnalysisLimits;
  custom_settings?: estypes.MlCustomSettings;
}

/** The body of a create datafeed request, ready to be sent to the ML API. */
export interface SuggestedDatafeedConfig {
  datafeed_id: string;
  job_id: string;
  indices: string[];
  query: estypes.QueryDslQueryContainer;
}

export type JobSuggestionValidationStatus = 'valid' | 'warning';

export interface JobSuggestionValidationMessage {
  id: string;
  status: string;
}

export interface JobSuggestionValidation {
  status: JobSuggestionValidationStatus;
  messages: JobSuggestionValidationMessage[];
}

export interface JobSuggestion {
  /** Identifies the suggestion within a response. This is not the job id. */
  id: string;
  /** Plain language name for what the job looks for. Not the job id. */
  title: string;
  /** Plain language explanation of what the job looks for and why it matters. */
  description: string;
  jobType: JOB_TYPE;
  job: SuggestedJobConfig;
  datafeed: SuggestedDatafeedConfig;
  estimatedModelMemoryLimit?: string;
  validation: JobSuggestionValidation;
}

export interface SuggestJobsResponse {
  suggestions: JobSuggestion[];
}
