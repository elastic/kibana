/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { LayoutInstance } from '../common/layouts/layout';
import { ConditionalHeaders, KbnServer } from '../../types';

export interface JobParamsPNG {
  objectType: string;
  title: string;
  relativeUrl: string;
  browserTimezone: string;
  layout: LayoutInstance;
}

export type ESQueueCreateJobFnPNG = (
  jobParams: JobParamsPNG,
  headers: ConditionalHeaders,
  request: Request
) => Promise<JobParamsPNG>;

export type CreateJobFactoryPNG = (server: KbnServer) => ESQueueCreateJobFnPNG;
