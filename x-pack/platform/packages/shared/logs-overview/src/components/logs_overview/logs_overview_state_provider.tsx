/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderFor } from '@kbn/xstate-utils';
import { createActorContext } from '@xstate5/react';
import { assign, setup } from 'xstate5';
import {
  LogsSourceConfiguration,
  ResolvedIndexNameLogsSourceConfiguration,
  resolveLogsSourceActor,
} from '../../utils/logs_source';
import { MlCapabilities, loadMlCapabilitiesActor } from '../../utils/ml_capabilities';

export const logsOverviewStateMachine = setup({
  types: {
    context: {} as {
      logsSource:
        | { status: 'unresolved'; value: LogsSourceConfiguration }
        | {
            status: 'resolved';
            value: ResolvedIndexNameLogsSourceConfiguration;
          };
      mlCapabilities: { status: 'unresolved' } | MlCapabilities;
      error?: Error;
    },
    input: {} as {
      logsSource: LogsSourceConfiguration;
    },
  },
  actors: {
    resolveLogsSource: getPlaceholderFor(resolveLogsSourceActor),
    loadMlCapabilities: getPlaceholderFor(loadMlCapabilitiesActor),
  },
  actions: {
    storeResolvedLogsSource: assign({
      logsSource: (_, params: { logsSource: ResolvedIndexNameLogsSourceConfiguration }) => ({
        status: 'resolved' as const,
        value: params.logsSource,
      }),
    }),
    storeMlCapabilities: assign({
      mlCapabilities: (_, params: { mlCapabilities: MlCapabilities }) => params.mlCapabilities,
    }),
    storeError: assign({
      error: (_, params: { error: unknown }) =>
        params.error instanceof Error ? params.error : new Error(String(params.error)),
    }),
  },
  guards: {
    isMlAvailable: ({ context }) => context.mlCapabilities?.status === 'available',
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2VYHkBuYBO2AlmAO4DKALgIYVgCyVAxgBaEB2YAdO4RYVckIAvdlADEEVB06xqtTmgw58RUpRr0mraTz4DhogNoAGALqJQAB1SxehKRZAAPRAEZXAZmOcA7AA4AVlcAnw8fADYAFj8AJnCAGhAAT0Q4mM4PV2MYgIBOD3CAvyjIgF9SxMUsXAJicjlNFnYuXX5BETYoBXRYMlQAVzxGLjw4VGQiTokpFrZsVABrEbGJsAAZHr7B4ZNzJBBrWz4HfZcEQtzOSIDwsONMuPDYxJSEAJifDNzIyI8-SP8P1+5UqPWUtTUDQYTR0bDs+g6XSqWyGy1g40m4nweFQeE4lmQNAAZriALacUbo1YbDAonZmRyHOwnUBnAJhK65PzGXJ5cK5Yw+EIvRB+AqcYLhcLGSLS6XXXIgkBVcGqeoaaHaWbw9qiTik5AAYSolioACNCII+HBulQIKJprD5ktbRA6EaTebLXY4LtGTZmWxHGdXPlOHEbpFclFIyFIiK3h8vr8-NGYtd2T4lSqamr1LRNc1uHC9LrOvqPaaLVbiLBXQ7sbj8YSKCS8OS0Hb3caq97rbA-fsmccg6dEB4Yq4JblvgEAtFpX8EslReLJYUPAr8lFs2Dc3V840tZwiVRLZAACqoACSJbawjAYgASgBRa8AOWvF+vAEE1teAC0X0HKwAxHYNRRiDxOBCCdIkndwfHcVwE15KcYigvxXECMUciw3clH3SENS0ItYGYVASFEGkX1wNgKFgMQyAACUwAB1AB9NZMAAcQ4w0fwvF8eMwJ9rxfMgQIOMD7FHVk3ACYw-E4cJXCFHwgTFd4-ATMJwgyDwbnCfw503JSCOqFQDyhUjpHIyjqPQY1aCgXFayY1jOO4viXwANRfd8L0khkhxkllnDcVwYmU7kfnuJDclcDNdIiAybi0oIoj8PxygqEA2FQCA4EcHMrOIgtbLAf0jlkiCEAAWg+BMkuUnwI3cec-FCDScry0qIXVCqYW1UsDE6arAzqycEyg-SMMKYxVPTYycgs1VrJI4bix1MakU2AZUQm8CxzeTdOG+QU8lCKJFo8XSoN8OJokUmUYhnOc1qIwajyLVoET1ZEDuGCkVkxI7apOop0guoVcmuyJboTSJ3HDJ7eQ+Qp4PCT6yu+wtYR2xFulpIG0QxSBwfCs5+TmiIpSw-IfAiGIEw3Th7jiDwLqgt7XBxgbD3xkb7yJg0ey9GtitCmqqcQfl7ugtqFu+B4fl60FCNxwXKu20bRcrCWfTrTt7XG6XJpOxCkZR+agjh+5okBfm8xsra-rLLoxc9asjddCnzeO+SEB59nwnTfwMNhrCAlZ9l2YnW5uYnRLnY2obj1Pc8ICvW9CaqgOIaD+doLyNTsuiuHgnjFcEG+S44b+eDvklGVU-Kn67IoqjOhouiGMpuSIoQTxsnOzcuUnJTtOr144m8LDsijIIPiS0I27xnX7O7qAaWcsBXLwWsB7qqKut8Vww40tSEI8O6a8U6GpRlNSoylTJctKIA */
  id: 'logsOverviewStateMachine',
  context: ({ input: { logsSource } }) => ({
    logsSource: {
      status: 'unresolved',
      value: logsSource,
    },
    mlCapabilities: {
      status: 'unresolved',
    },
    error: undefined,
  }),
  initial: 'initializing',
  states: {
    initializing: {
      states: {
        logsSource: {
          states: {
            resolving: {
              invoke: {
                src: 'resolveLogsSource',
                id: 'resolveLogsSource',

                input: ({ context }) => ({
                  logsSource: context.logsSource.value,
                }),

                onDone: {
                  target: 'resolved',
                  actions: [
                    {
                      type: 'storeResolvedLogsSource',
                      params: ({ event }) => ({ logsSource: event.output }),
                    },
                  ],
                },

                onError: {
                  target: '#logsOverviewStateMachine.failedToInitialize',
                  actions: [
                    {
                      type: 'storeError',
                      params: ({ event }) => ({ error: event.error }),
                    },
                  ],
                },
              },
            },

            resolved: {
              type: 'final',
            },
          },

          initial: 'resolving',
        },

        mlCapabilities: {
          states: {
            loading: {
              invoke: {
                src: 'loadMlCapabilities',
                id: 'loadMlCapabilities',

                onDone: {
                  target: 'loaded',
                  actions: [
                    {
                      type: 'storeMlCapabilities',
                      params: ({ event }) => ({ mlCapabilities: event.output }),
                    },
                  ],
                },

                onError: {
                  target: '#logsOverviewStateMachine.failedToInitialize',
                  actions: [
                    {
                      type: 'storeError',
                      params: ({ event }) => ({ error: event.error }),
                    },
                  ],
                },
              },
            },

            loaded: {
              type: 'final',
            },
          },

          initial: 'loading',
        },
      },

      type: 'parallel',

      onDone: 'showingLogEvents',
    },

    failedToInitialize: {
      type: 'final',

      on: {
        REINITIALIZE: 'initializing',
      },
    },

    showingLogEvents: {
      on: {
        SHOW_LOG_CATEGORIES: {
          target: 'showingLogCategories',
          guard: 'isMlAvailable',
        },
      },
    },

    showingLogCategories: {
      on: {
        SHOW_LOG_EVENTS: 'showingLogEvents',
      },
    },
  },
});

export const LogsOverviewStateContext = createActorContext(logsOverviewStateMachine);
