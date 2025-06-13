/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActorContext } from '@xstate5/react';
import { assign, setup } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
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
      mlCapabilities?: { status: 'unresolved' } | MlCapabilities;
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
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2VYHkBuYBO2AlmAO4DKALgIYVgCyVAxgBaEB2YAdO4RYVckIAvdlE5oMZVAFc8jLnjipkRNlADEEVB25tsqANYKlKsABl0sKbPkBtAAwBdRKAAOqWL0LaXIAB6IACwAnABsnACMgfahoQDsgRHBgXEAzIEANCAAnohx9gBMnAX2qfYJwakFoQAcEQCsAL6NWRJYuATE5NS0DCzsXDx8AsKi4pbWcsawyqoa+HioeJyuyDQAZksAtpyKM6YWkjJTDs5IIO6efD7nAQjJwZxxETU1MfVx9fX2EXFZuQgaoFApE4mF0vUaqkasFKs1WpYcPgiKRKDR6ExWDohvxBCI1JwtsgAMJUVxUABGhEEfDg4yoEFEmm0gz0hi4aAZdBJZMp1K8cFOvkuXhuoDugRq4Q+dVCyQioUCtSi-0QqWCNSeITC9m+9QKBXSgXhIDaSM6qJ6GP62LYXhG+LERNJ5KpNOIsHpjLU6gWSxWawomzwO05EG5Lr57sFTmFHlFbF8dweTxeb1CHy+Pz+OUQ9WiT2q+p+9UViQKJrNHRR3XRfSxXHWVGpkAAKqgAJJ24Z4sDqABKAFEOwA5DutjsAQTMHYAWoOhecRddE7c8wVVYCIpxtbD6hECt8DcaWqbEdWumjepiBrp7XimVodLAreMMOaa1frQ27z3RmpFzceMVyTRBgjBVNXliX40iSDdcwQSV7ELDMSgaMsD2aU82FQCA4F8KtkUvK16wGOMrm8VdxUQABaAocwBGj6k4WFWLY9jUkrc8iMtOsb1te9-ygciE1AhACgiTcDVSLVYXyQ99ziKUmlPQiLVra8bVZQTHTfKxjnkESQLXBA5U3UIoieUpyg1coM2CCtVO49Sv1IgS-10tpJnkXYTDmIzKLEiJfk3Z4QXicFEjKZJIS498L14zSfxxB0xi8gzplmSAArFfw8no4pvhidICkCCTgVCg1OAij45X1dCTwReKeI079bxSh8CWdXk3QFeAl2AwKTLMhDUmC4ptQzaFCh+XU4vaFrXP47SPLGbrXX5WlPTDUQcqovKEGChignGg0MySfJ0hqJTGrPZqXJI5bf1xITCR5Dbo221AGWygaKNyu58k1UJD11Qp0lSeTN0SR4zqVQ9SrlGpqnmj9iL4rTOCbFsIHbLsdLAPagt+ZiSjGpSIlSSEJOCTdSxky7Cgkz5ggVRymoWh6MeS7sXqEX6gP+-a7gPQ9CvsGIIlKfdS3ggEUlhos0NLYFMKwoA */
  id: 'logsOverviewStateMachine',
  context: ({ input: { logsSource } }) => ({
    logsSource: {
      status: 'unresolved',
      value: logsSource,
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

      onDone: 'initialized',
    },

    failedToInitialize: {
      type: 'final',

      on: {
        REINITIALIZE: 'initializing',
      },
    },

    initialized: {},
  },
});

export const LogsOverviewStateContext = createActorContext(logsOverviewStateMachine);
