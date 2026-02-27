/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { millisToNanos } from '@kbn/event-log-plugin/server';
import type { AlertDeletionContext } from '../alert_deletion_client';
import { EVENT_LOG_ACTIONS } from '../../plugin';

export const logSuccessfulDeletion = (
  context: AlertDeletionContext,
  runDate: Date,
  numDeleted: number,
  spaceIds: string[]
) => {
  const end = new Date();
  context.eventLogger.logEvent({
    '@timestamp': runDate.toISOString(),
    event: {
      action: EVENT_LOG_ACTIONS.deleteAlerts,
      outcome: 'success',
      start: runDate.toISOString(),
      end: end.toISOString(),
      duration: millisToNanos(end.getTime() - runDate.getTime()),
    },
    message: `Alert deletion task deleted ${numDeleted} alerts`,
    kibana: {
      alert: {
        deletion: {
          num_deleted: numDeleted,
        },
      },
      space_ids: spaceIds,
    },
  });
};

export const logFailedDeletion = (
  context: AlertDeletionContext,
  runDate: Date,
  numDeleted: number,
  spaceIds: string[],
  errMessage: string
) => {
  const end = new Date();
  context.eventLogger.logEvent({
    '@timestamp': runDate.toISOString(),
    event: {
      action: EVENT_LOG_ACTIONS.deleteAlerts,
      outcome: 'failure',
      start: runDate.toISOString(),
      end: end.toISOString(),
      duration: millisToNanos(end.getTime() - runDate.getTime()),
    },
    error: { message: errMessage },
    kibana: {
      alert: {
        deletion: {
          num_deleted: numDeleted,
        },
      },
      space_ids: spaceIds,
    },
  });
};
