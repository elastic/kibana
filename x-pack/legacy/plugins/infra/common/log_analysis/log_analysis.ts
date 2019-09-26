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

export const jobStatusRT = rt.keyof({
  created: null,
  missing: null,
  running: null,
});

export type JobStatus = rt.TypeOf<typeof jobStatusRT>;
