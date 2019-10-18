/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectAttributes } from 'src/core/server/types';
import { Datafeed, Job } from '../../public/jobs/new_job_new/common/job_creator/configs';

export interface ModuleJob {
  id: string;
  config: Omit<Job, 'job_id'>;
}

export interface KibanaObjectConfig extends SavedObjectAttributes {
  description: string;
  title: string;
  version: number;
}

export interface KibanaObject {
  id: string;
  title: string;
  config: KibanaObjectConfig;
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
  datafeeds: Datafeed[];
  kibana: KibanaObjects;
}

export interface KibanaObjectResponse {
  exists?: boolean;
  success?: boolean;
  id: string;
}

export interface SetupError {
  body: string;
  msg: string;
  path: string;
  query: {};
  response: string;
  statusCode: number;
}

export interface DatafeedResponse {
  id: string;
  success: boolean;
  started: boolean;
  error?: SetupError;
}

export interface JobResponse {
  id: string;
  success: boolean;
  error?: SetupError;
}

export interface DataRecognizerConfigResponse {
  datafeeds: DatafeedResponse[];
  jobs: JobResponse[];
  kibana: {
    search: KibanaObjectResponse;
    visualization: KibanaObjectResponse;
    dashboard: KibanaObjectResponse;
  };
}
