/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
/*
 * Return `true` if timestamp of last update is younger than 10 minutes ago
 * If older than, it indicates cluster/instance is offline
 */
export function calculateAvailability(timestamp) {
  const lastUpdate = moment(timestamp); // converts to local time
  return lastUpdate.isAfter(moment().subtract(10, 'minutes')); // compares with local time
}
