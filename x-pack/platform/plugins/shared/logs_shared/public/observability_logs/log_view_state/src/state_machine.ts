/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { assign, fromCallback, fromObservable, fromPromise, setup } from 'xstate';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { NotificationChannel } from '@kbn/xstate-utils';
import type { LogView, LogViewStatus, ResolvedLogView } from '../../../../common/log_views';
import type { ILogViewsClient } from '../../../services/log_views';
import type { LogViewNotificationEvent } from './notifications';
import { logViewNotificationEventSelectors } from './notifications';
import type {
  LogViewContext,
  LogViewContextWithError,
  LogViewContextWithLogView,
  LogViewContextWithReference,
  LogViewContextWithResolvedLogView,
  LogViewContextWithStatus,
  LogViewEvent,
} from './types';
import type {
  InitializeFromUrl,
  UpdateContextInUrl,
  ListenForUrlChanges,
} from './url_state_storage_service';

export const logViewStateMachine = setup({
  types: {
    input: {} as LogViewContextWithReference,
    context: {} as LogViewContext,
    events: {} as LogViewEvent,
  },
  actions: {
    notifyLoadingStarted: () => undefined,
    notifyLoadingSucceeded: () => undefined,
    notifyLoadingFailed: () => undefined,
    notifyPersistingInlineLogViewFailed: () => undefined,
    updateContextInUrl: () => undefined,
    storeLogViewReference: assign(({ context, event }) =>
      'logViewReference' in event && event.logViewReference !== null
        ? ({
            logViewReference: event.logViewReference,
          } as LogViewContextWithReference)
        : {}
    ),
    storeLogView: assign(({ event }) => {
      if ('output' in event && event.output) {
        return { logView: event.output } as LogViewContextWithLogView;
      }
      return {};
    }),
    storeResolvedLogView: assign(({ event }) => {
      if ('output' in event && event.output) {
        return { resolvedLogView: event.output } as LogViewContextWithResolvedLogView;
      }
      return {};
    }),
    storeStatus: assign(({ event }) => {
      if ('output' in event && event.output) {
        return { status: event.output } as LogViewContextWithStatus;
      }
      return {};
    }),
    storeError: assign(({ event }) => {
      // XState v5: onError events have the error in event.error
      if ('error' in event && event.error) {
        return { error: event.error as Error } as LogViewContextWithError;
      }
      return {};
    }),
    convertInlineLogViewReferenceToPersistedLogViewReference: assign(({ context, event }) =>
      'logView' in event && context.logViewReference.type === 'log-view-inline'
        ? ({
            logViewReference: {
              type: 'log-view-reference',
              logViewId: context.logViewReference.id,
            },
          } as LogViewContextWithReference)
        : {}
    ),
    updateLogViewReference: assign(({ context, event }) =>
      'attributes' in event && context.logViewReference.type === 'log-view-inline'
        ? ({
            logViewReference: {
              ...context.logViewReference,
              attributes: {
                ...context.logViewReference.attributes,
                ...event.attributes,
              },
            },
          } as LogViewContextWithReference)
        : {}
    ),
  },
  actors: {
    initializeFromUrl: fromCallback<LogViewEvent, LogViewContext>(({ sendBack }) => {
      sendBack({ type: 'INITIALIZED_FROM_URL', logViewReference: null });
    }),
    listenForUrlChanges: fromObservable<LogViewEvent, LogViewContext>(() => of()),
    loadLogView: fromPromise<LogView, LogViewContext>(async () => {
      throw new Error('loadLogView not implemented');
    }),
    updateLogView: fromPromise<LogView, { context: LogViewContext; event: LogViewEvent }>(
      async () => {
        throw new Error('updateLogView not implemented');
      }
    ),
    persistInlineLogView: fromPromise<LogView, LogViewContext>(async () => {
      throw new Error('persistInlineLogView not implemented');
    }),
    resolveLogView: fromPromise<ResolvedLogView<DataView>, LogViewContext>(async () => {
      throw new Error('resolveLogView not implemented');
    }),
    loadLogViewStatus: fromPromise<LogViewStatus, LogViewContext>(async () => {
      throw new Error('loadLogViewStatus not implemented');
    }),
  },
  guards: {
    isPersistedLogView: ({ context }) => context.logViewReference.type === 'log-view-reference',
  },
}).createMachine({
  context: ({ input }) => input,
  id: 'LogView',
  initial: 'uninitialized',
  states: {
    uninitialized: {
      always: {
        target: 'initializingFromUrl',
      },
    },
    initializingFromUrl: {
      on: {
        INITIALIZED_FROM_URL: {
          target: 'loading',
          actions: ['storeLogViewReference'],
        },
      },
      invoke: {
        src: 'initializeFromUrl',
        input: ({ context }) => context,
      },
    },
    loading: {
      entry: ['notifyLoadingStarted', 'updateContextInUrl'],
      invoke: {
        src: 'loadLogView',
        input: ({ context }) => context,
        onDone: {
          target: 'resolving',
          actions: 'storeLogView',
        },
        onError: {
          target: 'loadingFailed',
          actions: 'storeError',
        },
      },
    },
    resolving: {
      invoke: {
        src: 'resolveLogView',
        input: ({ context }) => context,
        onDone: {
          target: 'checkingStatus',
          actions: 'storeResolvedLogView',
        },
        onError: {
          target: 'resolutionFailed',
          actions: 'storeError',
        },
      },
    },
    checkingStatus: {
      invoke: {
        src: 'loadLogViewStatus',
        input: ({ context }) => context,
        onDone: [
          {
            target: 'resolvedPersistedLogView',
            actions: 'storeStatus',
            guard: 'isPersistedLogView',
          },
          {
            target: 'resolvedInlineLogView',
            actions: 'storeStatus',
          },
        ],
        onError: {
          target: 'checkingStatusFailed',
          actions: 'storeError',
        },
      },
    },
    resolvedPersistedLogView: {
      invoke: {
        src: 'listenForUrlChanges',
        input: ({ context }) => context,
      },
      entry: ['notifyLoadingSucceeded', 'updateContextInUrl'],
      on: {
        PERSIST_INLINE_LOG_VIEW: undefined,
        RELOAD_LOG_VIEW: {
          target: 'loading',
        },
        LOG_VIEW_URL_KEY_REMOVED: {
          actions: 'updateContextInUrl',
        },
      },
    },
    resolvedInlineLogView: {
      invoke: {
        src: 'listenForUrlChanges',
        input: ({ context }) => context,
      },
      entry: ['notifyLoadingSucceeded', 'updateContextInUrl'],
      on: {
        PERSIST_INLINE_LOG_VIEW: {
          target: 'persistingInlineLogView',
        },
        LOG_VIEW_URL_KEY_REMOVED: {
          actions: 'updateContextInUrl',
        },
      },
    },
    persistingInlineLogView: {
      invoke: {
        src: 'persistInlineLogView',
        input: ({ context }) => context,
        onDone: {
          target: 'resolving',
          actions: ['convertInlineLogViewReferenceToPersistedLogViewReference', 'storeLogView'],
        },
        onError: {
          target: 'persistingInlineLogViewFailed',
          actions: 'storeError',
        },
      },
    },
    persistingInlineLogViewFailed: {
      entry: 'notifyPersistingInlineLogViewFailed',
      on: {
        RETRY_PERSISTING_INLINE_LOG_VIEW: {
          target: 'persistingInlineLogView',
        },
      },
    },
    loadingFailed: {
      entry: 'notifyLoadingFailed',
      on: {
        RETRY: {
          target: 'loading',
        },
      },
    },
    resolutionFailed: {
      entry: 'notifyLoadingFailed',
      on: {
        RETRY: {
          target: 'resolving',
        },
      },
    },
    checkingStatusFailed: {
      entry: 'notifyLoadingFailed',
      on: {
        RETRY: {
          target: 'checkingStatus',
        },
      },
    },
    updating: {
      entry: 'notifyLoadingStarted',
      invoke: {
        src: 'updateLogView',
        input: ({ context, event }) => ({ context, event }),
        onDone: {
          target: 'resolving',
          actions: ['updateLogViewReference', 'storeLogView'],
        },
        onError: {
          target: 'updatingFailed',
          actions: 'storeError',
        },
      },
    },
    updatingFailed: {
      entry: 'notifyLoadingFailed',
      on: {
        RELOAD_LOG_VIEW: {
          target: 'loading',
        },
      },
    },
  },
  on: {
    LOG_VIEW_REFERENCE_CHANGED: {
      target: '.loading',
      actions: 'storeLogViewReference',
    },
    UPDATE: {
      target: '.updating',
    },
  },
});

export interface LogViewStateMachineImplementationDependencies {
  logViews: ILogViewsClient;
  notificationChannel?: NotificationChannel<LogViewContext, LogViewEvent, LogViewNotificationEvent>;
  initializeFromUrl?: InitializeFromUrl;
  updateContextInUrl?: UpdateContextInUrl;
  listenForUrlChanges?: ListenForUrlChanges;
}

export const createLogViewStateMachineImplementations = ({
  logViews,
  notificationChannel,
  initializeFromUrl,
  updateContextInUrl,
  listenForUrlChanges,
}: LogViewStateMachineImplementationDependencies) => ({
  actions: {
    ...(notificationChannel != null
      ? {
          notifyLoadingStarted: notificationChannel.notify(
            logViewNotificationEventSelectors.loadingLogViewStarted
          ),
          notifyLoadingSucceeded: notificationChannel.notify(
            logViewNotificationEventSelectors.loadingLogViewSucceeded
          ),
          notifyLoadingFailed: notificationChannel.notify(
            logViewNotificationEventSelectors.loadingLogViewFailed
          ),
        }
      : {}),
    ...(updateContextInUrl ? { updateContextInUrl } : {}),
  },
  actors: {
    ...(initializeFromUrl ? { initializeFromUrl } : {}),
    ...(listenForUrlChanges ? { listenForUrlChanges } : {}),
    loadLogView: fromPromise(async ({ input }: { input: LogViewContext }) => {
      if (!('logViewReference' in input)) {
        throw new Error('Failed to load log view');
      }
      return await logViews.getLogView(input.logViewReference);
    }),
    updateLogView: fromPromise(
      async ({ input }: { input: { context: LogViewContext; event: LogViewEvent } }) => {
        if (!('logViewReference' in input.context) || input.event.type !== 'UPDATE') {
          throw new Error(
            'Failed to update log view: Not invoked by update event with matching id.'
          );
        }
        return await logViews.putLogView(input.context.logViewReference, input.event.attributes);
      }
    ),
    persistInlineLogView: fromPromise(async ({ input }: { input: LogViewContext }) => {
      if (!('logViewReference' in input) || input.logViewReference.type !== 'log-view-inline') {
        throw new Error('Failed to persist inline Log View.');
      }
      return await logViews.putLogView(
        { type: 'log-view-reference', logViewId: input.logViewReference.id },
        input.logViewReference.attributes
      );
    }),
    resolveLogView: fromPromise(async ({ input }: { input: LogViewContext }) => {
      if (!('logView' in input)) {
        throw new Error('Failed to resolve log view: No log view found in context.');
      }
      return await logViews.resolveLogView(input.logView.id, input.logView.attributes);
    }),
    loadLogViewStatus: fromPromise(async ({ input }: { input: LogViewContext }) => {
      if (!('resolvedLogView' in input)) {
        throw new Error('Failed to resolve log view: No log view found in context.');
      }
      return await logViews.getResolvedLogViewStatus(input.resolvedLogView);
    }),
  },
});
