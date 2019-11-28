/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayoutInstance } from '../common/layouts/layout';
import { ConditionalHeaders, JobDocPayload, ServerFacade, RequestFacade } from '../../types';

// Job params: structure of incoming user request data, after being parsed from RISON
export interface JobParamsPDF {
  objectType: string;
  title: string;
  relativeUrls: string[];
  browserTimezone: string;
  layout: LayoutInstance;
}

// Job payload: structure of stored job data provided by create_job
export interface JobDocPayloadPDF extends JobDocPayload {
  basePath?: string;
  browserTimezone: string;
  forceNow?: string;
  layout: any;
  objects: Array<{
    relativeUrl: string;
  }>;
  relativeUrl: undefined;
}

export type ESQueueCreateJobFnPDF = (
  jobParams: JobParamsPDF,
  headers: ConditionalHeaders,
  request: RequestFacade
) => Promise<JobParamsPDF>;

export type CreateJobFactoryPDF = (server: ServerFacade) => ESQueueCreateJobFnPDF;
