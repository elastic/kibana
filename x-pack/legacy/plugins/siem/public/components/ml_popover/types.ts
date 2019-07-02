/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Group {
  id: string;
  jobIds: string[];
  calendarIds: string[];
}

export interface MlSetupArgs {
  configTemplate: string;
  indexPatternName: string;
  groups: string[];
  prefix?: string;
  headers: Record<string, string | undefined>;
}

export interface ConfigTemplate {
  name: string;
  defaultIndexPattern: string;
  jobs: string[];
}

export interface Job {
  datafeedId: string;
  datafeedIndices: string[];
  datafeedState: string;
  description: string;
  earliestTimestampMs?: number;
  groups: string[];
  hasDatafeed: boolean;
  id: string;
  isSingleMetricViewerJob: boolean;
  jobState: string;
  latestTimestampMs?: number;
  memory_status: string;
  processed_record_count: number;
}

export interface DisplayJob {
  title: string;
  description: string;
  isChecked: boolean;
}

export interface SetupMlResponseJob {
  id: string;
  success: boolean;
}

export interface SetupMlResponseDatafeed {
  id: string;
  success: boolean;
  started: boolean;
}

export interface SetupMlResponse {
  jobs: SetupMlResponseJob[];
  datafeeds: SetupMlResponseDatafeed[];
  kibana: {};
}

export interface StartDatafeedResponse {
  [key: string]: {
    started: boolean;
  };
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
