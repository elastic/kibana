/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayoutInstance, LayoutParams } from '../common/layouts/layout';
import { ConditionalHeaders, JobDocPayload, RequestFacade } from '../../types';

// Job params: structure of incoming user request data
export interface JobParamsPNG {
  objectType: string;
  title: string;
  relativeUrl: string;
  browserTimezone: string;
  layout: LayoutInstance;
}

// Job payload: structure of stored job data provided by create_job
export interface JobDocPayloadPNG extends JobDocPayload<JobParamsPNG> {
  basePath?: string;
  browserTimezone: string;
  forceNow?: string;
  layout: LayoutParams;
  relativeUrl: string;
}
