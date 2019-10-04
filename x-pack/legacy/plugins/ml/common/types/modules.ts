/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Datafeed, Job } from '../../public/jobs/new_job_new/common/job_creator/configs';

export interface ModuleJob {
  id: string;
  config: Partial<Job>;
}

export interface KibanaObject {
  id: string;
  title: string;
  config: {
    kibanaSavedObjectMeta: { searchSourceJSON: string };
    description: string;
    title: string;
    version: number;
  };
}

export interface KibanaObjects {
  [objectType: string]: KibanaObject[] | undefined;
  search?: KibanaObject[];
  visualization?: KibanaObject[];
  dashboard?: KibanaObject[];
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
