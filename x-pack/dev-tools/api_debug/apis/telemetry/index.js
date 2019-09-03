/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

export const name = 'telemetry';
export const description = 'Get the clusters stats for the last 1 hour from the Kibana server';
export const method = 'POST';
export const path = '/api/telemetry/v2/clusters/_stats';

// Get an object with start and end times for the last 1 hour, ISO format, in UTC
function getTimeRange() {
  const end = moment();
  const start = moment(end).subtract(1, 'hour');
  return {
    min: moment.utc(start).format(),
    max: moment.utc(end).format(),
  };
}

export const body = { timeRange: getTimeRange(), unencrypted: true };
