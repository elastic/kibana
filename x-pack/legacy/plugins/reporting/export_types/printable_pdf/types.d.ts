/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { LayoutInstance } from '../common/layouts/layout';
import { ConditionalHeaders, KbnServer } from '../../types';

// NOTE: this does not extend the main Params
export interface JobParamsPDF {
  objectType: string;
  title: string;
  relativeUrl: string;
  browserTimezone: string;
  layout: LayoutInstance;
}

export type ESQueueCreateJobFnPDF = (
  jobParams: JobParamsPDF,
  headers: ConditionalHeaders,
  request: Request
) => Promise<JobParamsPDF>;

export type CreateJobFactoryPDF = (server: KbnServer) => ESQueueCreateJobFnPDF;
