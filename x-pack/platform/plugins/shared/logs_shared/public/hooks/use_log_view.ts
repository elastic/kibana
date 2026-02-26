/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConsoleInspector } from '@kbn/xstate-utils';
import { useActorRef, useSelector } from '@xstate/react';
import createContainer from 'constate';
import { useCallback, useState } from 'react';
import { waitFor } from 'xstate';
import type { LogViewAttributes, LogViewReference, LogViewStatus } from '../../common/log_views';
import { DEFAULT_LOG_VIEW } from '../../common/log_views';
import type {
  InitializeFromUrl,
  UpdateContextInUrl,
  ListenForUrlChanges,
} from '../observability_logs/log_view_state/src/url_state_storage_service';
import {
  createLogViewNotificationChannel,
  logViewStateMachine,
  createLogViewStateMachineImplementations,
} from '../observability_logs/log_view_state';
import type { ILogViewsClient } from '../services/log_views';

export const useLogView = ({
  initialLogViewReference,
  logViews,
  initializeFromUrl,
  updateContextInUrl,
  listenForUrlChanges,
}: {
  initialLogViewReference?: LogViewReference;
  logViews: ILogViewsClient;
  initializeFromUrl?: InitializeFromUrl;
  updateContextInUrl?: UpdateContextInUrl;
  listenForUrlChanges?: ListenForUrlChanges;
}) => {
  const [logViewStateNotifications] = useState(() => createLogViewNotificationChannel());

  const logViewStateService = useActorRef(
    logViewStateMachine.provide(
      createLogViewStateMachineImplementations({
        logViews,
        notificationChannel: logViewStateNotifications,
        initializeFromUrl,
        updateContextInUrl,
        listenForUrlChanges,
      })
    ),
    {
      inspect: createConsoleInspector(),
      input: {
        logViewReference: initialLogViewReference ?? DEFAULT_LOG_VIEW,
      },
    }
  );

  const changeLogViewReference = useCallback(
    (logViewReference: LogViewReference) => {
      logViewStateService.send({
        type: 'LOG_VIEW_REFERENCE_CHANGED',
        logViewReference,
      });
    },
    [logViewStateService]
  );

  const logViewReference = useSelector(
    logViewStateService,
    (state) => state.context.logViewReference
  );

  const logView = useSelector(logViewStateService, (state) =>
    (state.matches('resolving') ||
      state.matches('checkingStatus') ||
      state.matches('resolvedPersistedLogView') ||
      state.matches('resolvedInlineLogView')) &&
    'logView' in state.context
      ? state.context.logView
      : undefined
  );

  const resolvedLogView = useSelector(logViewStateService, (state) =>
    (state.matches('checkingStatus') ||
      state.matches('resolvedPersistedLogView') ||
      state.matches('resolvedInlineLogView')) &&
    'resolvedLogView' in state.context
      ? state.context.resolvedLogView
      : undefined
  );

  const logViewStatus = useSelector(logViewStateService, (state) => {
    const matchesResolved =
      state.matches('resolvedPersistedLogView') || state.matches('resolvedInlineLogView');
    const hasStatus = 'status' in state.context;
    return matchesResolved && hasStatus
      ? (state.context as { status: LogViewStatus }).status
      : undefined;
  });

  const isLoadingLogView = useSelector(logViewStateService, (state) => state.matches('loading'));
  const isResolvingLogView = useSelector(logViewStateService, (state) =>
    state.matches('resolving')
  );
  const isLoadingLogViewStatus = useSelector(logViewStateService, (state) =>
    state.matches('checkingStatus')
  );
  const isUpdatingLogView = useSelector(logViewStateService, (state) => state.matches('updating'));

  const isLoading =
    isLoadingLogView || isResolvingLogView || isLoadingLogViewStatus || isUpdatingLogView;

  const isUninitialized = useSelector(logViewStateService, (state) =>
    state.matches('uninitialized')
  );

  const hasFailedLoadingLogView = useSelector(logViewStateService, (state) =>
    state.matches('loadingFailed')
  );
  const hasFailedResolvingLogView = useSelector(logViewStateService, (state) =>
    state.matches('resolutionFailed')
  );
  const hasFailedLoadingLogViewStatus = useSelector(logViewStateService, (state) =>
    state.matches('checkingStatusFailed')
  );

  const isPersistedLogView = useSelector(
    logViewStateService,
    (state) => state.context.logViewReference.type === 'log-view-reference'
  );

  const isInlineLogView = !isPersistedLogView;

  const latestLoadLogViewFailures = useSelector(logViewStateService, (state) =>
    (state.matches('loadingFailed') ||
      state.matches('resolutionFailed') ||
      state.matches('checkingStatusFailed')) &&
    'error' in state.context
      ? [state.context.error]
      : []
  );

  const hasFailedLoading = latestLoadLogViewFailures.length > 0;

  const retry = useCallback(
    () =>
      logViewStateService.send({
        type: 'RETRY',
      }),
    [logViewStateService]
  );

  const update = useCallback(
    async (logViewAttributes: Partial<LogViewAttributes>) => {
      logViewStateService.send({
        type: 'UPDATE',
        attributes: logViewAttributes,
      });

      const doneState = await waitFor(
        logViewStateService,
        (state) =>
          state.matches('updatingFailed') ||
          state.matches('resolvedPersistedLogView') ||
          state.matches('resolvedInlineLogView')
      );

      if (doneState.matches('updatingFailed') && 'error' in doneState.context) {
        throw doneState.context.error;
      }
    },
    [logViewStateService]
  );

  const revertToDefaultLogView = useCallback(() => {
    changeLogViewReference(DEFAULT_LOG_VIEW);
  }, [changeLogViewReference]);

  return {
    // Underlying state machine
    logViewStateService,
    logViewStateNotifications,

    // Failure states
    hasFailedLoading,
    hasFailedLoadingLogView,
    hasFailedLoadingLogViewStatus,
    hasFailedResolvingLogView,
    latestLoadLogViewFailures,

    // Loading states
    isUninitialized,
    isLoading,
    isLoadingLogView,
    isLoadingLogViewStatus,
    isResolvingLogView,

    // Data
    logViewReference,
    logView,
    resolvedLogView,
    logViewStatus,
    derivedDataView: resolvedLogView?.dataViewReference,
    isInlineLogView,
    isPersistedLogView,

    // Actions
    load: retry,
    retry,
    update,
    changeLogViewReference,
    revertToDefaultLogView,
  };
};

export const [LogViewProvider, useLogViewContext] = createContainer(useLogView);
