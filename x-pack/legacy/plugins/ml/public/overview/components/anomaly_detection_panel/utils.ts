/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// { id: group-id, max_anomaly_score: <score>, jobIds: num, latest_timestamp: 123456, docs_processed: num }
export function getGroupsFromJobs(jobs: any) {
  const groups: any = {};

  jobs.forEach((job: any) => {
    // Organize job by group
    if (job.groups !== undefined) {
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
    }
  });

  return Object.values(groups);
}

export function getStatsBarData(jobs: any) {
  return {};
}
