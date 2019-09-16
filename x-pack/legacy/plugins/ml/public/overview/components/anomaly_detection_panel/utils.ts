/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { JOB_STATE, DATAFEED_STATE } from '../../../../common/constants/states';
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

export function getStatsBarData(jobsList) {
  const jobStats = {
    activeNodes: {
      label: i18n.translate('xpack.ml.overviewJobsList.statsBar.activeMLNodesLabel', {
        defaultMessage: 'Active ML Nodes',
      }),
      value: 0,
      show: true,
    },
    total: {
      label: i18n.translate('xpack.ml.overviewJobsList.statsBar.totalJobsLabel', {
        defaultMessage: 'Total jobs',
      }),
      value: 0,
      show: true,
    },
    open: {
      label: i18n.translate('xpack.ml.overviewJobsList.statsBar.openJobsLabel', {
        defaultMessage: 'Open jobs',
      }),
      value: 0,
      show: true,
    },
    closed: {
      label: i18n.translate('xpack.ml.overviewJobsList.statsBar.closedJobsLabel', {
        defaultMessage: 'Closed jobs',
      }),
      value: 0,
      show: true,
    },
    failed: {
      label: i18n.translate('xpack.ml.overviewJobsList.statsBar.failedJobsLabel', {
        defaultMessage: 'Failed jobs',
      }),
      value: 0,
      show: false,
    },
    activeDatafeeds: {
      label: i18n.translate('xpack.ml.jobsList.statsBar.activeDatafeedsLabel', {
        defaultMessage: 'Active datafeeds',
      }),
      value: 0,
      show: true,
    },
  };

  if (jobsList === undefined) {
    return jobStats;
  }

  // object to keep track of nodes being used by jobs
  const mlNodes = {};
  let failedJobs = 0;

  jobsList.forEach(job => {
    if (job.jobState === JOB_STATE.OPENED) {
      jobStats.open.value++;
    } else if (job.jobState === JOB_STATE.CLOSED) {
      jobStats.closed.value++;
    } else if (job.jobState === JOB_STATE.FAILED) {
      failedJobs++;
    }

    if (job.hasDatafeed && job.datafeedState === DATAFEED_STATE.STARTED) {
      jobStats.activeDatafeeds.value++;
    }

    if (job.nodeName !== undefined) {
      mlNodes[job.nodeName] = {};
    }
  });

  jobStats.total.value = jobsList.length;

  // // Only show failed jobs if it is non-zero
  if (failedJobs) {
    jobStats.failed.value = failedJobs;
    jobStats.failed.show = true;
  } else {
    jobStats.failed.show = false;
  }

  jobStats.activeNodes.value = Object.keys(mlNodes).length;

  return jobStats;
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
