/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

export function formatDate(timestamp: string) {
  try {
    return moment(timestamp).format('YYYY-MM-DD @ hh:mm A');
  } catch (error) {
    // swallow error and display raw timestamp
    return timestamp;
  }
}
