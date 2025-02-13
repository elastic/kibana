/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { validateTimeRange, TIME_FORMAT } from '@kbn/ml-date-utils';
import type { TimeRange } from '@kbn/es-query';
import type { MlSummaryJob } from '../../../common';

export function createResultsUrlForJobs(
  jobsList: MlSummaryJob[],
  resultsPage: string,
  userTimeRange: TimeRange
) {
  let from;
  let to;
  let mode = 'absolute';
  const jobIds = jobsList.map((j) => j.id);

  // if the custom default time filter is set and enabled in advanced settings
  // if time is either absolute date or proper datemath format
  if (validateTimeRange(userTimeRange)) {
    from = userTimeRange.from;
    to = userTimeRange.to;
    // if both pass datemath's checks but are not technically absolute dates, use 'quick'
    // e.g. "now-15m" "now+1d"
    const fromFieldAValidDate = moment(userTimeRange.from).isValid();
    const toFieldAValidDate = moment(userTimeRange.to).isValid();
    if (!fromFieldAValidDate && !toFieldAValidDate) {
      return createResultsUrl(jobIds, from, to, resultsPage, 'quick');
    }
  } else {
    // if time range is specified but with incorrect format
    // change back to the default time range but alert the user
    // that the advanced setting config is invalid
    if (userTimeRange) {
      mode = 'invalid';
    }

    if (jobsList.length === 1) {
      from = jobsList[0].earliestTimestampMs;
      to = jobsList[0].latestResultsTimestampMs; // Will be max(latest source data, latest bucket results)
    } else {
      const jobsWithData = jobsList.filter((j) => j.earliestTimestampMs !== undefined);
      if (jobsWithData.length > 0) {
        from = Math.min(...jobsWithData.map((j) => j.earliestTimestampMs!));
        to = Math.max(...jobsWithData.map((j) => j.latestResultsTimestampMs!));
      }
    }
  }

  const fromString = moment(from).format(TIME_FORMAT); // Defaults to 'now' if 'from' is undefined
  const toString = moment(to).format(TIME_FORMAT); // Defaults to 'now' if 'to' is undefined

  return createResultsUrl(jobIds, fromString, toString, resultsPage, mode);
}

export function createResultsUrl(
  jobIds: string[],
  start: number | string,
  end: number | string,
  resultsPage: string,
  mode = 'absolute'
) {
  const idString = jobIds.map((j) => `'${j}'`).join(',');
  let from;
  let to;
  let path = '';

  if (resultsPage !== undefined) {
    path += resultsPage;
  }

  if (mode === 'quick') {
    from = start;
    to = end;
  } else {
    from = moment(start).toISOString();
    to = moment(end).toISOString();
  }

  path += `?_g=(ml:(jobIds:!(${idString}))`;
  path += `,refreshInterval:(display:Off,pause:!t,value:0),time:(from:'${from}'`;
  path += `,to:'${to}'`;
  if (mode === 'invalid') {
    path += `,mode:invalid`;
  }
  path += "))&_a=(query:(query_string:(analyze_wildcard:!t,query:'*')))";

  return path;
}
