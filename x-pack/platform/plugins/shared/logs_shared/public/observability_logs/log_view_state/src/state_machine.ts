/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of, throwError } from 'rxjs';
import { assign, fromCallback, fromObservable, setup } from 'xstate';
import type { NotificationChannel } from '@kbn/xstate-utils';
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

export const createPureLogViewStateMachine = (initialContext: LogViewContextWithReference) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UBqBLMB3AxMgPIDiA+hgJICiA6mZQCJkDCAEgIIByJ1jA2gAYAuolAAHVLCwAXLKgB2YkAA9EAFkEBmAHQAmAGwB2dQYAcAVkGmAjGYMAaEAE9EAWi3qjO9WcGCLIzMbLWMLAE4AX0inNEwcAgBVAAVGDgAVaiFRJBBJaTlFZTUEG20DfUEDLUtwg3CbdXUtJ1cEDz11HSMLTzMagwtjAOjY9Gw8HQBXBSxZuQBDABssAC9IfGzlfNl5JVySz3CdGwMwrRsbCK0a1sQyiqNDCMEjcK09QT8LUZA4idwOiWqAWEDmUEIRA4jEoPDIAGVEiwWNQ+HwtrkdoV9qASkZPDoLnpwmZniTgmY7ghSTorP5fFo6lorHobL9-gkgSCwQoIcRobDyAAxDiUZDokTbKS7IoHRBWMzdT4vCxDPQ3PRUvTqnThcL+OoWVmdU7qdnjTkAJzgqCWADdwfgAErUeFEZCJdKUIhcMgisUSnISaXY4qIcm0y6XJ5mdR6Iw2IxanV6g2DY3qRPm+KTa2wW0O3nO13uz3e32I5GoxiBqUFPZh0ra7z9S6CBo9G4tFyIGl06z9JlWOzZgE6ADGAAswOOANbg+EyBYyKawfDsagsADSgoR6QyiXhftF4oEksxIYbctKFhCOksxjsF3CQSTPYQ2t0qfb6ZsJqMo6clOM7zryi7Lqu65sJuO5wvC+7pIeCJIiiaJnkGeSXrKuL3K+3RnJ8eqGPGgRUm8PjEvq5jBKE6oATEfwWrmNr2hsLr8swxDkFQdAYsG9bYao9x6BYXSkjcBrqp8RiOO+Hg6NUAzhEM6gkvUNRmgxHKTMCoLgkKCxYEsbHUOkToAJp8ZhAk4kJCCMl0MlPKqoS+O2b5tJ0jynGc+KCHowR1HogHMfmSxTNiBlGSZZmWee-EyrZJT6jYCkfARVxaDJsZaqY3Q+cYWj+YFBghYCwFzguS4rrAUXGRAxaxVZWJXjhpSZt4ng2O84Qie2njdp5eUJmchXFd1BjBVpTGAlM4gQMujopGkXpwv6p7NVhSXCV43SqfU2qqYYWVUm42rHAOcb1L12gsmV0zzYtRbLRku6VqhNboXWiWNi+3j6spfSDB84TqKdZjHAY-kRE05hfMSbLTTms2PXIvJ1SZHFkFxFA0LQm02Y2xiKsyJJNPqNxQ5Scl-hYOgBEVt6fsYqn0QxCioBAcDKNpuDfaG14hIq9T2FcjSWEEgync0XQkv4k1ZQYjQRD8SNjjMcy7MsayQPzrV2XYFQi0rt6+IE9gWFSZR09qZzNN1fRDFEaucrpPJQHrgklF4ej0yJInKRDpIeYg5hKoMZhvGUbxFfRYzIzoeYFuCnvbQgcs+Gb+oib4x1UsE4e9PYZzWLe90VaBUDgTVqeNmLF1GlU9S+FDRpkcLKkhO8Vwkqr8djknrEQLX16spcCl0poRoGE0NztxP1QvmLARPM7-eu9y+mGfVI9tV4RuXOqgSJsSIlUrRJyr8fdT+FUfeMQng8RXsGPDxehPXkvlTVAmQy9Le59JqX2JPiF8gxMyR3LtOSqYFqqrlfrvA2jcfAWH6IYGePtwjnwiCcYqHxbCqk0Jpdekw5oLTRh7d+P1P5nAUp8Dq6hRJeFVKdTovtSR2CaD+TMTQzD3TIU9KACCqECzauLOmYtiZZRqAOVhxJ7ysljCEGSTQ4xs0iEAA */
  setup({
    types: {
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
      storeLogView: assign(({ event }) =>
        'logView' in event
          ? ({
              logView: event.logView,
            } as LogViewContextWithLogView)
          : {}
      ),
      storeResolvedLogView: assign(({ event }) =>
        'resolvedLogView' in event
          ? ({
              resolvedLogView: event.resolvedLogView,
            } as LogViewContextWithResolvedLogView)
          : {}
      ),
      storeStatus: assign(({ event }) =>
        'status' in event
          ? ({
              status: event.status,
            } as LogViewContextWithStatus)
          : {}
      ),
      storeError: assign(({ event }) =>
        'error' in event
          ? ({
              error: event.error,
            } as LogViewContextWithError)
          : {}
      ),
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
      loadLogView: fromObservable<LogViewEvent, LogViewContext>(() => of()),
      updateLogView: fromObservable<LogViewEvent, { context: LogViewContext; event: LogViewEvent }>(
        () => of()
      ),
      persistInlineLogView: fromObservable<LogViewEvent, LogViewContext>(() => of()),
      resolveLogView: fromObservable<LogViewEvent, LogViewContext>(() => of()),
      loadLogViewStatus: fromObservable<LogViewEvent, LogViewContext>(() => of()),
    },
    guards: {
      isPersistedLogView: ({ context }) => context.logViewReference.type === 'log-view-reference',
    },
  }).createMachine({
    context: initialContext,
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
        },
        on: {
          LOADING_SUCCEEDED: {
            target: 'resolving',
            actions: 'storeLogView',
          },
          LOADING_FAILED: {
            target: 'loadingFailed',
            actions: 'storeError',
          },
        },
      },
      resolving: {
        invoke: {
          src: 'resolveLogView',
          input: ({ context }) => context,
        },
        on: {
          RESOLUTION_FAILED: {
            target: 'resolutionFailed',
            actions: 'storeError',
          },
          RESOLUTION_SUCCEEDED: {
            target: 'checkingStatus',
            actions: 'storeResolvedLogView',
          },
        },
      },
      checkingStatus: {
        invoke: {
          src: 'loadLogViewStatus',
          input: ({ context }) => context,
        },
        on: {
          CHECKING_STATUS_FAILED: {
            target: 'checkingStatusFailed',
            actions: 'storeError',
          },
          CHECKING_STATUS_SUCCEEDED: [
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
        },
        on: {
          PERSISTING_INLINE_LOG_VIEW_FAILED: {
            target: 'persistingInlineLogViewFailed',
            actions: 'storeError',
          },
          PERSISTING_INLINE_LOG_VIEW_SUCCEEDED: {
            target: 'resolving',
            actions: ['convertInlineLogViewReferenceToPersistedLogViewReference', 'storeLogView'],
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
        },
        on: {
          UPDATING_FAILED: {
            target: 'updatingFailed',
            actions: 'storeError',
          },
          UPDATING_SUCCEEDED: {
            target: 'resolving',
            actions: ['updateLogViewReference', 'storeLogView'],
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

export interface LogViewStateMachineDependencies {
  initialContext: LogViewContextWithReference;
  logViews: ILogViewsClient;
  notificationChannel?: NotificationChannel<LogViewContext, LogViewEvent, LogViewNotificationEvent>;
  initializeFromUrl?: InitializeFromUrl;
  updateContextInUrl?: UpdateContextInUrl;
  listenForUrlChanges?: ListenForUrlChanges;
}

export const createLogViewStateMachine = ({
  initialContext,
  logViews,
  notificationChannel,
  initializeFromUrl,
  updateContextInUrl,
  listenForUrlChanges,
}: LogViewStateMachineDependencies) =>
  createPureLogViewStateMachine(initialContext).provide({
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
      loadLogView: fromObservable(({ input }: { input: LogViewContext }) =>
        from(
          'logViewReference' in input
            ? logViews.getLogView(input.logViewReference)
            : throwError(() => new Error('Failed to load log view'))
        ).pipe(
          map(
            (logView): LogViewEvent => ({
              type: 'LOADING_SUCCEEDED',
              logView,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'LOADING_FAILED',
              error,
            })
          )
        )
      ),
      updateLogView: fromObservable(
        ({ input }: { input: { context: LogViewContext; event: LogViewEvent } }) =>
          from(
            'logViewReference' in input.context && input.event.type === 'UPDATE'
              ? logViews.putLogView(input.context.logViewReference, input.event.attributes)
              : throwError(
                  () =>
                    new Error(
                      'Failed to update log view: Not invoked by update event with matching id.'
                    )
                )
          ).pipe(
            map(
              (logView): LogViewEvent => ({
                type: 'UPDATING_SUCCEEDED',
                logView,
              })
            ),
            catchError((error) =>
              of<LogViewEvent>({
                type: 'UPDATING_FAILED',
                error,
              })
            )
          )
      ),
      persistInlineLogView: fromObservable(({ input }: { input: LogViewContext }) =>
        from(
          'logViewReference' in input && input.logViewReference.type === 'log-view-inline'
            ? logViews.putLogView(
                { type: 'log-view-reference', logViewId: input.logViewReference.id },
                input.logViewReference.attributes
              )
            : throwError(() => new Error('Failed to persist inline Log View.'))
        ).pipe(
          map(
            (logView): LogViewEvent => ({
              type: 'PERSISTING_INLINE_LOG_VIEW_SUCCEEDED',
              logView,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'PERSISTING_INLINE_LOG_VIEW_FAILED',
              error,
            })
          )
        )
      ),
      resolveLogView: fromObservable(({ input }: { input: LogViewContext }) =>
        from(
          'logView' in input
            ? logViews.resolveLogView(input.logView.id, input.logView.attributes)
            : throwError(
                () => new Error('Failed to resolve log view: No log view found in context.')
              )
        ).pipe(
          map(
            (resolvedLogView): LogViewEvent => ({
              type: 'RESOLUTION_SUCCEEDED',
              resolvedLogView,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'RESOLUTION_FAILED',
              error,
            })
          )
        )
      ),
      loadLogViewStatus: fromObservable(({ input }: { input: LogViewContext }) =>
        from(
          'resolvedLogView' in input
            ? logViews.getResolvedLogViewStatus(input.resolvedLogView)
            : throwError(
                () => new Error('Failed to resolve log view: No log view found in context.')
              )
        ).pipe(
          map(
            (status): LogViewEvent => ({
              type: 'CHECKING_STATUS_SUCCEEDED',
              status,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'CHECKING_STATUS_FAILED',
              error,
            })
          )
        )
      ),
    },
  });
