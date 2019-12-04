/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobDocPayload, JobParamPostPayload, ConditionalHeaders, RequestFacade } from '../../types';

export interface JobParamPostPayloadDiscoverCsv extends JobParamPostPayload {
  state?: {
    query: any;
    sort: any[];
  };
}

export interface JobParamsDiscoverCsv {
  indexPatternId?: string;
  post?: JobParamPostPayloadDiscoverCsv;
}

export interface JobDocPayloadDiscoverCsv extends JobDocPayload<JobParamsDiscoverCsv> {
  basePath: string;
  searchRequest: any;
  fields: any;
  indexPatternSavedObject: any;
  metaFields: any;
  conflictedTypesFields: any;
}
