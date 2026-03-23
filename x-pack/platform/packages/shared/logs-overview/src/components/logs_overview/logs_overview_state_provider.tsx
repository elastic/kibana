/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderFor } from '@kbn/xstate-utils';
import { createActorContext } from '@xstate/react';
import { assign, setup } from 'xstate';
import type { LogsOverviewFeatureFlags } from '../../types';
import type {
  LogsSourceConfiguration,
  ResolvedIndexNameLogsSourceConfiguration,
} from '../../utils/logs_source';
import { resolveLogsSourceActor } from '../../utils/logs_source';
import type { MlCapabilities } from '../../utils/ml_capabilities';
import { loadMlCapabilitiesActor } from '../../utils/ml_capabilities';

export const logsOverviewStateMachine = setup({
  types: {
    context: {} as {
      error?: Error;
      featureFlags: LogsOverviewFeatureFlags;
      logsSource:
        | { status: 'unresolved'; value: LogsSourceConfiguration }
        | {
            status: 'resolved';
            value: ResolvedIndexNameLogsSourceConfiguration;
          };
      mlCapabilities: { status: 'unresolved' } | MlCapabilities;
    },
    input: {} as {
      featureFlags: LogsOverviewFeatureFlags;
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2VYHkBuYBO2AlmAO4DKALgIYVgCyVAxgBaEB2YAdO4RYVckIAvdlADEEVB06xqtTmgw58RUpRr0mraTz4DhogNoAGALqJQAB1SxehKRZAAPRAEZXAZmOcA7AA4AVlcAnw8fADYAFj8AJnCAGhAAT0Q4mM4PV2MYgIBOD3CAvyjIgF9SxMUsXAJicjlNFnYuXX5BETYoBXRYMlQAVzxGLjw4VGQiTokpFrZsVABrEbGJsAAZHr7B4ZNzJBBrWz4HfZcEQtzOSIDwsONMuPDYxJSEAJifDNzIyI8-SP8P1+5UqPWUtTUDQYTR0bDs+g6XSqWyGy1g40m4nweFQeE4lmQNAAZriALacUbo1YbDAonZmRyHOwnUBnAIFDIxYwBPLcooeX4vRDfbxPdkxDx5SJZcLhEEgKrg1T1DTQ7SzeHtUScUnIADCVEsVAARoRBHw4N0qBBRNNYfMllaIHR9YaTWa7HBdoybMy2I4zp4-JxjK5IvkfEFjLcvAEhW8AZwcsZcj4035U64-B55Yqasr1LQ1c1uHC9FrOjrXUbTebiLAnbbsbj8YSKCS8OS0NaXQaax6LbBvfsmcd-adUn5PgEU7lck9wj5XDF-nHkogoq5OOyw35XLls4VjH5c2D83VC411ZwiVQzZAACqoACSZbawjAYgASgBRZ8AOWfB9nwAQTWZ8AC0f2HKxfTHANEFidIPFyEJuX3f5wlTeMsh5Xx3nZSMl0yXJTyUc9IVVLQS1gZhUBIUQaR-XA2AoWAxDIAAJTAAHUAH01kwABxPi9RAh8fyEzAv2fH8yBgg44PscdWTcGdg3CVwiKBbN3j8eMwnCDJJVlfweQFY8yOqFQLyhajpFo+jGPQA1aCgXF6w47j+MEkSfwANR-f8H3khkRyUllnDcZdgz8YwfnuJdcjDHkDIiYybl0oIoj8E95TYVAIDgRw8xsyii3ssAfSOZSEIQABaD4cOiXw4nDHxj0XYp5yspVbKomENXLAxOmqv06piVx4wlIyYja958muSNil6iiVQqwbS01EakU2AZUTG+CJzeAVOBFSNUwKSJow8AyJVaqIfGlPk8hyVayvWq8S1aBFtWRfbhgpFZMUO2rjqKdJzryUIohu+NpS3OaolQj5CkiOJ3ohT7i1hbbEW6WkAbRDFIFByKziw2aIllPcIwiGJ40KDwQw8OIUOuiUYmSzGCzszaforLpdT7d062K8KavJjdcju5mfDid5NMjRd5Z5-qNuvAWdqrEXa09BtuxtUaJfG473B8eH3CTBX9w6gUp3+NXyq+3Hhvx4W3T1wcnVJk2jtUhBOZDcIcmXbkfAPfl42pq5jDTW5inDIonexyqbzvZBHxfN8ESqv2wYDgJ0auMNQ8MgFIhw7lIm3bIbn3LmQ+XFPLxxrhHIYzomJYtiyZUqKEE8bIzoFA9JuPPTK-XQPwm8PdsiT5clwBHMKgVM8PtbtOO+cqBXLAdy8HrPu6piz4lxDp6tMmzxbunmdIdleKtPDWVMnKcogA */
  id: 'logsOverviewStateMachine',
  context: ({ input: { featureFlags, logsSource } }) => ({
    error: undefined,
    featureFlags,
    logsSource: {
      status: 'unresolved',
      value: logsSource,
    },
    mlCapabilities: {
      status: 'unresolved',
    },
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

                input: ({ context }) => ({
                  featureFlags: context.featureFlags,
                }),

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
                  target: 'loaded',
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
