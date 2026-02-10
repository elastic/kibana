/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { type NotificationChannel } from '@kbn/xstate-utils';
import type {
  LogView,
  LogViewAttributes,
  LogViewReference,
  LogViewStatus,
  ResolvedLogView,
} from '../../../../common/log_views';
import { type LogViewNotificationEvent } from './notifications';

export interface LogViewContextWithReference {
  logViewReference: LogViewReference;
}

export interface LogViewContextWithLogView {
  logView: LogView;
}

export interface LogViewContextWithResolvedLogView {
  resolvedLogView: ResolvedLogView<DataView>;
}

export interface LogViewContextWithStatus {
  status: LogViewStatus;
}

export interface LogViewContextWithError {
  error: Error;
}

export type LogViewTypestate =
  | {
      value: 'uninitialized';
      context: LogViewContextWithReference;
    }
  | {
      value: 'loading';
      context: LogViewContextWithReference;
    }
  | {
      value: 'resolving';
      context: LogViewContextWithReference & LogViewContextWithLogView;
    }
  | {
      value: 'checkingStatus';
      context: LogViewContextWithReference &
        LogViewContextWithLogView &
        LogViewContextWithResolvedLogView;
    }
  | {
      value: 'resolvedPersistedLogView';
      context: LogViewContextWithReference &
        LogViewContextWithLogView &
        LogViewContextWithResolvedLogView &
        LogViewContextWithStatus;
    }
  | {
      value: 'resolvedInlineLogView';
      context: LogViewContextWithReference &
        LogViewContextWithLogView &
        LogViewContextWithResolvedLogView &
        LogViewContextWithStatus;
    }
  | {
      value: 'updating';
      context: LogViewContextWithReference;
    }
  | {
      value: 'loadingFailed';
      context: LogViewContextWithReference & LogViewContextWithError;
    }
  | {
      value: 'updatingFailed';
      context: LogViewContextWithReference & LogViewContextWithError;
    }
  | {
      value: 'resolutionFailed';
      context: LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError;
    }
  | {
      value: 'checkingStatusFailed';
      context: LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError;
    };

export type LogViewContext = LogViewTypestate['context'];

export type LogViewStateValue = LogViewTypestate['value'];

export type LogViewEvent =
  | {
      type: 'LOG_VIEW_REFERENCE_CHANGED';
      logViewReference: LogViewReference;
    }
  | {
      type: 'INITIALIZED_FROM_URL';
      logViewReference: LogViewReference | null;
    }
  | {
      type: 'LOADING_SUCCEEDED';
      logView: LogView;
    }
  | {
      type: 'LOADING_FAILED';
      error: Error;
    }
  | {
      type: 'RESOLUTION_SUCCEEDED';
      resolvedLogView: ResolvedLogView<DataView>;
    }
  | {
      type: 'UPDATE';
      attributes: Partial<LogViewAttributes>;
    }
  | {
      type: 'UPDATING_SUCCEEDED';
      logView: LogView;
    }
  | {
      type: 'UPDATING_FAILED';
      error: Error;
    }
  | {
      type: 'RESOLUTION_FAILED';
      error: Error;
    }
  | {
      type: 'CHECKING_STATUS_SUCCEEDED';
      status: LogViewStatus;
    }
  | {
      type: 'CHECKING_STATUS_FAILED';
      error: Error;
    }
  | {
      type: 'RETRY';
    }
  | {
      type: 'RELOAD_LOG_VIEW';
    }
  | {
      type: 'PERSIST_INLINE_LOG_VIEW';
    }
  | { type: 'PERSISTING_INLINE_LOG_VIEW_FAILED'; error: Error }
  | { type: 'PERSISTING_INLINE_LOG_VIEW_SUCCEEDED'; logView: LogView }
  | {
      type: 'RETRY_PERSISTING_INLINE_LOG_VIEW';
    }
  | { type: 'LOG_VIEW_URL_KEY_REMOVED' }
  | { type: 'LOG_VIEW_URL_KEY_CHANGED' };

export type LogViewNotificationChannel = NotificationChannel<
  LogViewContext,
  LogViewEvent,
  LogViewNotificationEvent
>;
