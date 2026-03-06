/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { createNotificationChannel } from '@kbn/xstate-utils';
import type {
  LogViewReference,
  LogViewStatus,
  ResolvedLogView,
} from '../../../../common/log_views';
import type { LogViewContext, LogViewEvent } from './types';

export type LogViewNotificationEvent =
  | {
      type: 'LOADING_LOG_VIEW_STARTED';
      logViewReference: LogViewReference;
    }
  | {
      type: 'LOADING_LOG_VIEW_SUCCEEDED';
      resolvedLogView: ResolvedLogView<DataView>;
      status: LogViewStatus;
    }
  | {
      type: 'LOADING_LOG_VIEW_FAILED';
      error: Error;
    };

export const createLogViewNotificationChannel = () =>
  createNotificationChannel<LogViewContext, LogViewEvent, LogViewNotificationEvent>();

export const logViewNotificationEventSelectors = {
  loadingLogViewStarted: ({ context }: { context: LogViewContext; event: LogViewEvent }) =>
    'logViewReference' in context
      ? ({
          type: 'LOADING_LOG_VIEW_STARTED',
          logViewReference: context.logViewReference,
        } as LogViewNotificationEvent)
      : undefined,
  loadingLogViewSucceeded: ({ context }: { context: LogViewContext; event: LogViewEvent }) =>
    'resolvedLogView' in context && 'status' in context
      ? ({
          type: 'LOADING_LOG_VIEW_SUCCEEDED',
          resolvedLogView: context.resolvedLogView,
          status: context.status,
        } as LogViewNotificationEvent)
      : undefined,
  loadingLogViewFailed: ({ context }: { context: LogViewContext; event: LogViewEvent }) =>
    'error' in context
      ? ({
          type: 'LOADING_LOG_VIEW_FAILED',
          error: context.error,
        } as LogViewNotificationEvent)
      : undefined,
};
