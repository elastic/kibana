/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectAttributes } from 'src/core/public';
import { Datafeed, Job } from '../../public/application/jobs/new_job/common/job_creator/configs';

export interface ModuleJob {
  id: string;
  config: Omit<Job, 'job_id'>;
}

export interface ModuleDataFeed {
  id: string;
  config: Omit<Datafeed, 'datafeed_id'>;
}

export interface KibanaObjectConfig extends SavedObjectAttributes {
  description: string;
  title: string;
  version: number;
  kibanaSavedObjectMeta?: {
    searchSourceJSON: string;
  };
}

export interface KibanaObject {
  id: string;
  title: string;
  config: KibanaObjectConfig;
  exists?: boolean;
}

export interface KibanaObjects {
  [objectType: string]: KibanaObject[] | undefined;
}

/**
 * Interface for get_module endpoint response.
 */
export interface Module {
  id: string;
  title: string;
  description: string;
  type: string;
  logoFile: string;
  defaultIndexPattern: string;
  query: any;
  jobs: ModuleJob[];
  datafeeds: ModuleDataFeed[];
  kibana: KibanaObjects;
}

export interface ResultItem {
  id: string;
  success?: boolean;
}

export interface KibanaObjectResponse extends ResultItem {
  exists?: boolean;
  error?: any;
}

export interface SetupError {
  body: string;
  msg: string;
  path: string;
  query: {};
  response: string;
  statusCode: number;
}

export interface DatafeedResponse extends ResultItem {
  started: boolean;
  error?: SetupError;
}

export interface JobResponse extends ResultItem {
  error?: SetupError;
}

export interface DataRecognizerConfigResponse {
  datafeeds: DatafeedResponse[];
  jobs: JobResponse[];
  kibana: {
    search: KibanaObjectResponse[];
    visualization: KibanaObjectResponse[];
    dashboard: KibanaObjectResponse[];
  };
}

export type GeneralOverride = any;

export type JobOverride = Partial<Job>;

export type DatafeedOverride = Partial<Datafeed>;
