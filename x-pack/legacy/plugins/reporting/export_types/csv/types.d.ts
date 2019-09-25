/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from '@hapi/hapi';
import { JobDocPayload, JobParamPostPayload, ConditionalHeaders } from '../../types';

export interface JobParamPostPayloadDiscoverCsv extends JobParamPostPayload {
  state?: {
    query: any;
    sort: any[];
  };
}

export interface JobParamsDiscoverCsv {
  indexPatternId?: string;
  post?: JobParamPostPayloadDiscoverCsv; // delete this
}

export interface JobDocPayloadDiscoverCsv extends JobDocPayload {
  searchRequest: any;
  fields: any;
  indexPatternSavedObject: any;
  metaFields: any;
  conflictedTypesFields: any;
}

export type ESQueueCreateJobFnDiscoverCsv = (
  jobParams: JobParamsDiscoverCsv,
  headers: ConditionalHeaders,
  request: Request
) => Promise<JobParamsDiscoverCsv>;
