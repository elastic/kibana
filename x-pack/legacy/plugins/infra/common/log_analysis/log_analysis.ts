/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const jobTypeRT = rt.keyof({
  'log-entry-rate': null,
});

export type JobType = rt.TypeOf<typeof jobTypeRT>;

// combines and abstracts job and datafeed status
export type JobStatus =
  | 'unknown'
  | 'missing'
  | 'initializing'
  | 'stopped'
  | 'started'
  | 'finished'
  | 'failed';

export type SetupStatus =
  | 'initializing' // acquiring job statuses to determine setup status
  | 'unknown' // job status could not be acquired (failed request etc)
  | 'required' // jobs are missing
  | 'pending' // In the process of setting up the module for the first time or retrying, waiting for response
  | 'succeeded' // setup succeeded, notifying user
  | 'failed' // setup failed, notifying user
  | 'hiddenAfterSuccess' // hide the setup screen and we show the results for the first time
  | 'skipped'; // setup hidden because the module is in a correct state already
