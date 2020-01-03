/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import d3 from 'd3';

import { Dictionary } from '../../../../common/types/common';
import { MlJobWithTimeRange } from '../../../../common/types/jobs';

export function getGroupsFromJobs(jobs: MlJobWithTimeRange[]) {
  const groups: Dictionary<any> = {};
  const groupsMap: Dictionary<any> = {};

  jobs.forEach(job => {
    // Organize job by group
    if (job.groups !== undefined) {
      job.groups.forEach(g => {
        if (groups[g] === undefined) {
          groups[g] = {
            id: g,
            jobIds: [job.job_id],
            timeRange: {
              to: job.timeRange.to,
              toMoment: null,
              from: job.timeRange.from,
              fromMoment: null,
              fromPx: job.timeRange.fromPx,
              toPx: job.timeRange.toPx,
              widthPx: null,
            },
          };

          groupsMap[g] = [job.job_id];
        } else {
          groups[g].jobIds.push(job.job_id);
          groupsMap[g].push(job.job_id);
          // keep track of earliest 'from' / latest 'to' for group range
          if (groups[g].timeRange.to === null || job.timeRange.to > groups[g].timeRange.to) {
            groups[g].timeRange.to = job.timeRange.to;
            groups[g].timeRange.toMoment = job.timeRange.toMoment;
          }
          if (groups[g].timeRange.from === null || job.timeRange.from < groups[g].timeRange.from) {
            groups[g].timeRange.from = job.timeRange.from;
            groups[g].timeRange.fromMoment = job.timeRange.fromMoment;
          }
          if (groups[g].timeRange.toPx === null || job.timeRange.toPx > groups[g].timeRange.toPx) {
            groups[g].timeRange.toPx = job.timeRange.toPx;
          }
          if (
            groups[g].timeRange.fromPx === null ||
            job.timeRange.fromPx < groups[g].timeRange.fromPx
          ) {
            groups[g].timeRange.fromPx = job.timeRange.fromPx;
          }
        }
      });
    }
  });

  Object.keys(groups).forEach(groupId => {
    const group = groups[groupId];
    group.timeRange.widthPx = group.timeRange.toPx - group.timeRange.fromPx;
    group.timeRange.toMoment = moment(group.timeRange.to);
    group.timeRange.fromMoment = moment(group.timeRange.from);
    // create label
    const fromString = group.timeRange.fromMoment.format('MMM Do YYYY, HH:mm');
    const toString = group.timeRange.toMoment.format('MMM Do YYYY, HH:mm');
    group.timeRange.label = i18n.translate('xpack.ml.jobSelectList.groupTimeRangeLabel', {
      defaultMessage: '{fromString} to {toString}',
      values: {
        fromString,
        toString,
      },
    });
  });

  return { groups: Object.keys(groups).map(g => groups[g]), groupsMap };
}

export function getTimeRangeFromSelection(jobs: MlJobWithTimeRange[], selection: string[]) {
  if (jobs.length > 0) {
    const times: number[] = [];
    jobs.forEach(job => {
      if (selection.includes(job.job_id)) {
        if (job.timeRange.from !== undefined) {
          times.push(job.timeRange.from);
        }
        if (job.timeRange.to !== undefined) {
          times.push(job.timeRange.to);
        }
      }
    });
    if (times.length) {
      const extent = d3.extent(times);
      const selectedTime = {
        from: moment(extent[0]).toISOString(),
        to: moment(extent[1]).toISOString(),
      };
      return selectedTime;
    }
  }
}

export function normalizeTimes(
  jobs: MlJobWithTimeRange[],
  dateFormatTz: string,
  ganttBarWidth: number
) {
  const jobsWithTimeRange = jobs.filter(job => {
    return job.timeRange.to !== undefined && job.timeRange.from !== undefined;
  });

  const min = Math.min(...jobsWithTimeRange.map(job => +job.timeRange.from));
  const max = Math.max(...jobsWithTimeRange.map(job => +job.timeRange.to));
  const ganttScale = d3.scale
    .linear()
    .domain([min, max])
    .range([1, ganttBarWidth]);

  jobs.forEach(job => {
    if (job.timeRange.to !== undefined && job.timeRange.from !== undefined) {
      job.timeRange.fromPx = ganttScale(job.timeRange.from);
      job.timeRange.toPx = ganttScale(job.timeRange.to);
      job.timeRange.widthPx = job.timeRange.toPx - job.timeRange.fromPx;
      // Ensure at least 1 px in width so it's always visible
      if (job.timeRange.widthPx < 1) {
        job.timeRange.widthPx = 1;
      }

      job.timeRange.toMoment = moment(job.timeRange.to).tz(dateFormatTz);
      job.timeRange.fromMoment = moment(job.timeRange.from).tz(dateFormatTz);

      const fromString = job.timeRange.fromMoment.format('MMM Do YYYY, HH:mm');
      const toString = job.timeRange.toMoment.format('MMM Do YYYY, HH:mm');
      job.timeRange.label = i18n.translate('xpack.ml.jobSelector.jobTimeRangeLabel', {
        defaultMessage: '{fromString} to {toString}',
        values: {
          fromString,
          toString,
        },
      });
    } else {
      job.timeRange.widthPx = 0;
      job.timeRange.fromPx = 0;
      job.timeRange.toPx = 0;
      job.timeRange.label = i18n.translate('xpack.ml.jobSelector.noResultsForJobLabel', {
        defaultMessage: 'No results',
      });
    }
  });
  return jobs;
}
