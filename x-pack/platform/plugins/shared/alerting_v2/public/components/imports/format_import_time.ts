/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

/** "3 minutes ago" for a timestamp, or null when there is none. */
export const formatRelativeTime = (value: string | null | undefined): string | null =>
  value ? moment(value).fromNow() : null;

/** Colors for the status of the latest workflow run. */
export const getExecutionStatusColor = (
  status: string
): 'success' | 'danger' | 'primary' | 'default' => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
    case 'timed_out':
      return 'danger';
    case 'running':
    case 'pending':
    case 'waiting':
      return 'primary';
    default:
      return 'default';
  }
};
