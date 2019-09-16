/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Group } from './anomaly_detection_panel';

export function getGroupsFromJobs(jobs: any): Group[] {
  const groups: any = {
    no_group: {
      id: 'ungrouped',
      jobIds: [],
      docs_processed: 0,
      latest_timestamp: 0,
      max_anomaly_score: null,
    },
  };

  jobs.forEach((job: any) => {
    // Organize job by group
    if (job.groups.length > 0) {
      job.groups.forEach((g: any) => {
        if (groups[g] === undefined) {
          groups[g] = {
            id: g,
            jobIds: [job.id],
            docs_processed: job.processed_record_count,
            latest_timestamp: 0,
            max_anomaly_score: null,
          };
        } else {
          groups[g].jobIds.push(job.id);
          groups[g].docs_processed += job.processed_record_count;
          // if incoming job latest timestamp is greater than the last saved one, replace it
          if (job.latestTimestampMs > groups[g].latest_timestamp) {
            groups[g].latest_timestamp = job.latestTimestampMs;
          }
        }
      });
    } else {
      groups.no_group.jobIds.push(job.id);
      groups.no_group.docs_processed += job.processed_record_count;
      // if incoming job latest timestamp is greater than the last saved one, replace it
      if (job.latestTimestampMs > groups.no_group.latest_timestamp) {
        groups.no_group.latest_timestamp = job.latestTimestampMs;
      }
    }
  });

  return Object.values(groups);
}

export function getJobsFromGroup(group: Group, jobs: any) {
  return group.jobIds.map(jobId => jobs[jobId]).filter(id => id !== undefined);
}

export function getJobsWithTimerange(jobsList: any) {
  const jobs: any = {};
  jobsList.forEach((job: any) => {
    if (jobs[job.id] === undefined) {
      // create the job in the object with the times you need
      if (job.earliestTimestampMs !== undefined) {
        const { earliestTimestampMs, latestResultsTimestampMs } = job;
        jobs[job.id] = {
          id: job.id,
          earliestTimestampMs,
          latestResultsTimestampMs,
        };
      }
    }
  });

  return jobs;
}

export function getStatsBarData(jobs: any) {
  return {};
}
