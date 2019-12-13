/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { Datafeed } from './datafeed';
import { Job } from './job';

// in older implementations of the job config, the datafeed was placed inside the job
// for convenience.
export interface CombinedJob extends Job {
  datafeed_config: Datafeed;
}

export function expandCombinedJobConfig(combinedJob: CombinedJob) {
  const combinedJobClone = cloneDeep(combinedJob);
  const job = combinedJobClone;
  const datafeed = combinedJobClone.datafeed_config;
  delete job.datafeed_config;

  return { job, datafeed };
}
