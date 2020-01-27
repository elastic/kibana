/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY } from '../../common/constants';

export const jobCompletionNotifications = {
  add(jobId) {
    const jobs = this.getAll();
    jobs.push(jobId);
    this._set(jobs);
  },

  getAll() {
    const sessionValue = sessionStorage.getItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY);
    return sessionValue ? JSON.parse(sessionValue) : [];
  },

  remove(jobId) {
    const jobs = this.getAll();
    const index = jobs.indexOf(jobId);
    if (!index) {
      throw new Error('Unable to find job to remove it');
    }

    jobs.splice(index, 1);
    this._set(jobs);
  },

  _set(jobs) {
    sessionStorage.setItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY, JSON.stringify(jobs));
  },
};
