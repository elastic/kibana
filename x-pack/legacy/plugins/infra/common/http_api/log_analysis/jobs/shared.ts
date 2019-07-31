/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { jobStatusRT, jobTypeRT } from '../../../log_analysis';

export const jobDescriptorRT = rt.type({
  jobId: rt.string,
  jobStatus: jobStatusRT,
  jobType: jobTypeRT,
});

export type JobDescriptor = rt.TypeOf<typeof jobDescriptorRT>;
