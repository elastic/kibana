/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CalendarManager } from '../calendar';

export function groupsProvider(callWithRequest) {
  const calMngr = new CalendarManager(callWithRequest);

  async function getAllGroups() {
    const groups = {};
    const jobIds = {};
    const [JOBS, CALENDARS] = [0, 1];
    const results = await Promise.all([callWithRequest('ml.jobs'), calMngr.getAllCalendars()]);

    if (results[JOBS] && results[JOBS].jobs) {
      results[JOBS].jobs.forEach(job => {
        jobIds[job.job_id] = null;
        if (job.groups !== undefined) {
          job.groups.forEach(g => {
            if (groups[g] === undefined) {
              groups[g] = {
                id: g,
                jobIds: [job.job_id],
                calendarIds: [],
              };
            } else {
              groups[g].jobIds.push(job.job_id);
            }
          });
        }
      });
    }
    if (results[CALENDARS]) {
      results[CALENDARS].forEach(cal => {
        cal.job_ids.forEach(jId => {
          if (jobIds[jId] === undefined) {
            if (groups[jId] === undefined) {
              groups[jId] = {
                id: jId,
                jobIds: [],
                calendarIds: [cal.calendar_id],
              };
            } else {
              groups[jId].calendarIds.push(cal.calendar_id);
            }
          }
        });
      });
    }

    return Object.keys(groups).map(g => groups[g]);
  }

  async function updateGroups(jobs) {
    const results = {};
    for (const job of jobs) {
      const { job_id: jobId, groups } = job;
      try {
        await callWithRequest('ml.updateJob', { jobId, body: { groups } });
        results[jobId] = { success: true };
      } catch (error) {
        results[jobId] = { success: false, error };
      }
    }
    return results;
  }

  return {
    getAllGroups,
    updateGroups,
  };
}
