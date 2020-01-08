/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { datafeedsProvider } from './datafeeds';
import { jobsProvider } from './jobs';
import { groupsProvider } from './groups';
import { newJobCapsProvider } from './new_job_caps';
import { newJobChartsProvider } from './new_job';

export function jobServiceProvider(callWithRequest, request) {
  return {
    ...datafeedsProvider(callWithRequest),
    ...jobsProvider(callWithRequest),
    ...groupsProvider(callWithRequest),
    ...newJobCapsProvider(callWithRequest, request),
    ...newJobChartsProvider(callWithRequest, request),
  };
}
