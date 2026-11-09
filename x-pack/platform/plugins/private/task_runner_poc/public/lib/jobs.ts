/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job } from '../../common';
import { formatTime } from './format';

/** Jobs that fire later: scheduled jobs, and one-shot jobs waiting for their `runAt`. */
export const isUpcoming = (job: Job): boolean => job.every !== null || job.nextFireAt !== null;

export const jobFiresText = (job: Job): string => {
  if (job.every) {
    return `every ${job.every}`;
  }
  return job.runAt ? `once at ${formatTime(job.runAt)}` : 'once';
};

/** How a task's job fires, for the tasks list; undefined when the job is gone. */
export const jobKindText = (job: Job | undefined): string | undefined => {
  if (!job) {
    return undefined;
  }
  return job.every ? `every ${job.every}` : 'one-shot';
};
