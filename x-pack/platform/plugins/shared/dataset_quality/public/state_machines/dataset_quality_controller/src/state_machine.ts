/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core/public';
import { getDateISORange } from '@kbn/timerange';
import type { ActorRefFrom } from 'xstate';
import { assign, fromCallback, fromPromise, setup } from 'xstate';
import type {
  DatasetTypesPrivileges,
  DataStreamDocsStat,
  DataStreamStat,
  NonAggregatableDatasets,
} from '../../../../common/api_types';
import { DEFAULT_DATASET_TYPE, KNOWN_TYPES } from '../../../../common/constants';
import type {
  DataStreamStatServiceResponse,
  GetDataStreamsTypesPrivilegesResponse,
} from '../../../../common/data_streams_stats';
import type { Integration } from '../../../../common/data_streams_stats/integration';
import type { DataStreamType } from '../../../../common/types';
import type { IDataStreamsStatsClient } from '../../../services/data_streams_stats';
import { generateDatasets } from '../../../utils';
import { fetchNonAggregatableDatasetsFailedNotifier } from '../../common/notifications';
import { DEFAULT_CONTEXT } from './defaults';
import {
  fetchDatasetStatsFailedNotifier,
  fetchDatasetTypesPrivilegesFailedNotifier,
  fetchDegradedStatsFailedNotifier,
  fetchFailedStatsFailedNotifier,
  fetchIntegrationsFailedNotifier,
  fetchTotalDocsFailedNotifier,
  updateFailureStoreFailedNotifier,
  updateFailureStoreSuccessNotifier,
} from './notifications';
import type { DatasetQualityControllerContext, DatasetQualityControllerEvent } from './types';

const extractAuthorizedDatasetTypes = (datasetTypesPrivileges: DatasetTypesPrivileges) =>
  Object.entries(datasetTypesPrivileges)
    .filter(([_type, priv]) => priv.canMonitor || priv.canRead)
    .map(([type, _priv]) => type.replace(/-\*-\*$/, '')) as DataStreamType[];

const generateInvokePerType = () => {
  return {
    invoke: KNOWN_TYPES.map((type) => ({
      id: `${type}`,
      src: 'loadDataStreamDocsStats' as const,
      input: ({ context }: { context: DatasetQualityControllerContext }) => ({ context, type }),
    })),
  };
};

export const createPureDatasetQualityControllerStateMachine = (
  initialContext: DatasetQualityControllerContext
) =>
  setup({
    types: {
      context: {} as DatasetQualityControllerContext,
      events: {} as DatasetQualityControllerEvent,
    },
    actions: {
      storeTableOptions: assign(({ event }) => {
        return 'dataset_criteria' in event
          ? {
              table: event.dataset_criteria,
            }
          : {};
      }),
      resetPage: assign(({ context }) => ({
        table: {
          ...context.table,
          page: 0,
        },
      })),
      storeInactiveDatasetsVisibility: assign(({ context }) => {
        return {
          filters: {
            ...context.filters,
            inactive: !context.filters.inactive,
          },
        };
      }),
      storeFullDatasetNamesVisibility: assign(({ context }) => {
        return {
          filters: {
            ...context.filters,
            fullNames: !context.filters.fullNames,
          },
        };
      }),
      storeTimeRange: assign(({ context, event }) => {
        return 'timeRange' in event
          ? {
              filters: {
                ...context.filters,
                timeRange: event.timeRange,
              },
            }
          : {};
      }),
      storeIntegrationsFilter: assign(({ context, event }) => {
        return 'integrations' in event
          ? {
              filters: {
                ...context.filters,
                integrations: event.integrations,
              },
            }
          : {};
      }),
      storeNamespaces: assign(({ context, event }) => {
        return 'namespaces' in event
          ? {
              filters: {
                ...context.filters,
                namespaces: event.namespaces,
              },
            }
          : {};
      }),
      storeQualities: assign(({ context, event }) => {
        return 'qualities' in event
          ? {
              filters: {
                ...context.filters,
                qualities: event.qualities,
              },
            }
          : {};
      }),
      storeTypes: assign(({ context, event }) => {
        return 'types' in event
          ? {
              filters: {
                ...context.filters,
                types: event.types,
              },
            }
          : {};
      }),
      storeQuery: assign(({ context, event }) => {
        return 'query' in event
          ? {
              filters: {
                ...context.filters,
                query: event.query,
              },
            }
          : {};
      }),
      storeDatasets: assign(({ context }) => {
        return context.integrations
          ? {
              datasets: generateDatasets(
                context.dataStreamStats,
                context.degradedDocStats,
                context.failedDocStats,
                context.integrations,
                context.totalDocsStats
              ),
            }
          : {};
      }),
      storeEmptyIntegrations: assign(() => {
        return {
          integrations: [],
        };
      }),
      // Placeholder actions that get overridden in provide()
      storeAuthorizedDatasetTypes: assign(() => ({})),
      storeDataStreamStats: assign(() => ({})),
      storeTotalDocStats: assign(() => ({})),
      storeDegradedDocStats: assign(() => ({})),
      storeFailedDocStats: assign(() => ({})),
      storeNonAggregatableDatasets: assign(() => ({})),
      storeIntegrations: assign(() => ({})),
      notifyFetchDatasetTypesPrivilegesFailed: () => {},
      notifyFetchDatasetStatsFailed: () => {},
      notifyFetchDegradedStatsFailed: () => {},
      notifyFetchNonAggregatableDatasetsFailed: () => {},
      notifyFetchIntegrationsFailed: () => {},
      notifyFetchTotalDocsFailed: () => {},
      notifyFetchFailedStatsFailed: () => {},
      notifyUpdateFailureStoreSuccess: () => {},
      notifyUpdateFailureStoreFailed: () => {},
    },
    actors: {
      loadDatasetTypesPrivileges: fromPromise<GetDataStreamsTypesPrivilegesResponse, void>(
        async () => {
          throw new Error('Not implemented');
        }
      ),
      loadDataStreamStats: fromPromise<
        DataStreamStatServiceResponse,
        DatasetQualityControllerContext
      >(async () => {
        throw new Error('Not implemented');
      }),
      loadDataStreamDocsStats: fromCallback<
        DatasetQualityControllerEvent,
        { context: DatasetQualityControllerContext; type: DataStreamType }
      >(() => {}),
      loadDegradedDocs: fromPromise<DataStreamDocsStat[], DatasetQualityControllerContext>(
        async () => {
          throw new Error('Not implemented');
        }
      ),
      loadFailedDocs: fromPromise<DataStreamDocsStat[], DatasetQualityControllerContext>(
        async () => {
          throw new Error('Not implemented');
        }
      ),
      loadNonAggregatableDatasets: fromPromise<
        NonAggregatableDatasets,
        DatasetQualityControllerContext
      >(async () => {
        throw new Error('Not implemented');
      }),
      loadIntegrations: fromPromise<Integration[], void>(async () => {
        throw new Error('Not implemented');
      }),
      updateFailureStore: fromPromise<
        void,
        { context: DatasetQualityControllerContext; event: DatasetQualityControllerEvent }
      >(async () => {
        throw new Error('Not implemented');
      }),
    },
    guards: {
      hasAuthorizedTypes: ({ event }) => {
        if (!('output' in event) || typeof event.output !== 'object' || !event.output) {
          return false;
        }
        const output = event.output as GetDataStreamsTypesPrivilegesResponse;
        return (
          'datasetTypesPrivileges' in output &&
          extractAuthorizedDatasetTypes(output.datasetTypesPrivileges).length > 0
        );
      },
      checkIfActionForbidden: ({ event }) => {
        if (!('error' in event) || typeof event.error !== 'object' || event.error === null) {
          return false;
        }
        return (event.error as { statusCode?: number }).statusCode === 403;
      },
      checkIfNotImplemented: ({ event }) => {
        if (!('error' in event) || typeof event.error !== 'object' || event.error === null) {
          return false;
        }
        return (event.error as { statusCode?: number }).statusCode === 501;
      },
    },
  }).createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOhNrJOJIC8uUAMQQ6YTrQBu1ANYS0mbHkKkKNekxZtJPPoNpQEXGQGMMJOgG0ADAF1bdxKAAO1WDzrOQAD0QBmAA5-dgBWQIBOACYAdgiANniI0IBGfxSAGhByRCj49hSAFht-KJtQm0CYlPjQwqiAXwasxSwcAj51OkZmVg4uPVIDETFaCRM5BQw2lU6qbq0+3XReIaFjaWpzFet7KxSnJBA3Dx3abz8EKpt2fxioiv9-aMLQ6Kycq5Tb+pSYwPCMTiUSqTRa02UHTU800vR0AxW+iEwjYTA4LiIGAAZtQGABbditSGqMgwnrafrcRFrQwbMwWXYOezeE6ec5HS5FG6BSKBQoRGo8mp1D65J7sf6JRI2BIpPJ1MEgIntEldWEU9h41BcdiwTDoWDsCAQnCwYQAVQACsgAIIAFQAogB9O0ASQAss6AEo2gByAHEHY4We42RdEEUYqEJVFincKoDQjFRQgUilghK4pF4tVahUIorlbNoRpyUstTq9RhDcalKbhF6HQAxRsAZQAEk7bXabcGjqyzuHU4UozG41HylUkym0+LkoU7rG7kUoo1mkqTcXSaXFjoK7Rdfqa5vDVicKYABbI0bjTbyQmbqHbhZwjj7w-Vo0n9hn9CX9YTNsli0I4fauKGg4chGCRRLcNjxGm8GBLGwTJtkEZlNGkQRDYxShEk-xRoWj6qmSu5vtqB5VgaX51jRv7-oYKIMGi7AYtiuIEkWT5qmWe6UR+NG1jMp7nletKAQyIF7My-YQcBQ4pDBcEISkSEoXcM6zmENjpskDzlPcxF0TxZGvpqAnUTWYBQAwqAQJAyBbGaVrds6bqek6PoBkGsngacClQcOo73OOCZTmhnwpKk3wxK8Dz1IEtQRIUxkzKZO7me+VlGjZdkORATmmGajYtg6HZdvavZ+cc8leEFkbRqFJQTomkURoUCHsAKEQxP4NgDdUAL+GlxJzJlGrZUeuW2fZjnOT+YnXuIkgyPe3GkRN5aWdNDmzQVRWiX+4lGJJZygTVA6BaAnIJDcIJpIUan9TUTwzqEeQSnUhTIaUTyVPEo0quNL6TTtn57fl83FYtx3IqiuJsZi6A4viD4mZtoPbZWu15XNhULQxJ10lsUkXYc-lhg1d3sA9-hPSUunxG96GpvErzsDyEQ8kE6ZSkDW68eRFk4xDeMHYTS1MQj6LI6jXEkSD6rY1RuP7dDR2MadmxAYy+wU7VAX1Td0HxPdgSPc9TMs1FC6FLcSZPDEA3FBEI3rhtSt8RRov0dqrAE8VFrWva7ket6fqBmBhtUybwVNbGLXhVG7UICnYSlFGNSxHUUQFh7isllj-G+6e-saw2zZtp23bVQbV3G74HUhYn8aTinKbOzEEo2PcsT0xb9NruCGNe8LU2fli5eB5rJ2iCtEzrYXz7KyXquT9Ph2w1rJO69JTL13V7Jx0pnUFBEbuPXFukAimqGc0lSQAgzAqBALGXFz769+yQAdb0T8MWKI3YijTi6N0qY1Xl-QSZdf4a23sTM6wFyYhiNsfJuqYUr5CUpfem190yhBTMkbuNhVxqQGv4dm-Jh4blHkXKBItv6wL-pLOG0sgGyw4mjT29DvaMJgT+TerCd5IL1gcVBscMGn2wRfdIeDigEJTE-dgiRQj0zuEkfqaj36QL4RPH+LCYYAPYaxEB8twFjV4ePcGBj4HGO1vSc6ewoiHzQYpLB59cEjgUbfVmcVow-WSGoshVR4g0J4SvPRNiazOVbEeYQrYbQADV3IAHkewABkuypMoK2J0rYex2lbNHBu6DOQjgTmFdu05WZlGSAUBcvdeq4WqE8HRY8srRKNLE+Jvp0muibAATRdOkm0WTkA5LyQU+0eSmw2ldBkh0yASlH0UhUscSdqmp3TLhFRyR0xPDzvBIE7SrGdNLt04qcTqzCD6W6IZIzMnZNyfkwpsz5mLOWeIuSbiGrrOam3NqM4L4RAlIUTqoQkwwQvuE5eQtzlMMubAa5Bpg5uRdOHLykdfKuMkeUluVSgWsyUrs+mYT0g8n+ACU5kTrEXLEFc+JpVq6VR7Cs35J9-mt1ahFGcz8whlC7mbPkMR2Y0vhWDC5tA6A2igLZGy0wABGrAiwuRDo6DFnlvJR0uqsv5BLNlEs+K3bqOEzYVFiFEem4qzKSsRdK2gsr5VQCVSqk8lcyoVVruyvFzdKmGt5bU-wdQCi1EqL3EcyEFQFzobShFAiHVOoYAqzAyqwCqoQctMYq1JgWOBmcu1CaZVyuTS61Nbq6KzwAjrMmMlcWQTjmUPO7BKjqOqOmWIYSUyxnTKa7mQRnYymijaraa8i2OpLSm1AaaM32OYqYuWYCIkSpVuOpNU6Z3fnsbvWtB8JENowU20FraFztuQqKqI3aYq3ASNzYoZQ0glBHZ-fhOVE2TrLdOitIlM0mOAYu7hcLbWrrfcW51rr01bqlg40mTiHDfMpgey4R6W3BFPWmc9Xag2fTNnkN2vMkhu2fQw98XB0B4zOGq9FHkI4+R9UhiMH0+U8i+oKqIgp2PM2I1EnUZGKPARKlXcqNcqr0eulIpjxLgiBG6vKSNPJAgRu43Sg8fHZqUbRaHJ0rpfSOn9D6N0qTfTFN1RyiTl7iWuzCPydmCFX7RGU-GtTdkNOuS076G0npWyWhtJQcqYnG6ckk1FCo9sUqKeduQ-qgMY0QI6YW5zUkqNadwOaMZro3T+dM761MwWIxmxuGS-kxRKj3F0o5hL9B+N0GSxqu0gzLRZfreJzkVqZMLitcE+4dxervSeuwX4fwkoDs6jFkecWC2rsS659VzpUsOi9IMgLZTEBJm7k8NR5Qh4fUoTOWM9tkLBH7uCj6vUKtTaq+pgTv6RgLzvFMWNK6x3Teu9u0R+9ltDjCbBYhuEh3xEU3kGccUQh1CTOUaFsRzvPcuy5170H53-q4QrR7wGYfkauzVm7O64OfaCt97q4PXaClIfEPlYSVEWzUv4w7rxofQJe1jog1B8aabqzaAAQosp0lAvQZYW66Ou+6WuIBeGEAH97O1RiqHy3SBRIVqL+ilcooR6f8MZ7QQ0zPWd2lSf6f03OdO+bdCk1lNpWwOiKXjuOOFu4IQBOx6ICF7gzhzMe9MFtXi6UoaKtXpHYdJfYNrgqwhdf6+502c0GTxlVQt3aJ0HmvPW4wZEbuyEAeO90n8AH70MxhJKDhN4ec1Gq8VNKhy8AjjLrRwwYXgXEAAFpYywX6mUYIN8BR9RTA35mPc1GSmZht4dsXLFxo1AiVYAghB15WwgBvp84Jt5epEP4-hu0hGd5tpI+FdI-TfiP-NY+lgT-0FJJs08Z9DnSFhU+ZRdLRDkWT1mA8HaQoGjnCXKQ1dgDxC4CgKKwBL8goL4wsBREhXhs4OsUw5FOZKEpx6gYoAY-dKIgC458IUw7YCg-hSFggigfo0xkDS5UCpEesNlAVA1PgPpvgFwL5UgUp8IgQv8D9BYa9X1doTxiDylYgyCeUO5iVScCh-heoaglINFCDEVhJlAq1DBOCIxIsVEZROpDspdCFiU5QmphVcIqF-txCBFJDTQg8WcCpZCEAyFu5Fdeo3ZfhIgtJ6haYC94xwUHg7hdCcpIZ8ZDoTCVxu4AVeCakoo8EW16Z8IigqhYxfdmCP4SMul3CJYjFoMvD5CzYsFlDRUowZxXgQh7gEJvsihHp99xtR8ntoE3DxZ4Fg9IATC2sbgkhopdJ8I3Yc9LNe8Ices84gQ4oYhXC1YoYZ52B8BaBUB8B0ALxcQBBKifkctqi9k6jopNEmiop2YQh0hcIcIahmZC9uiN44EZ4vD6gfDuVk5-DEBhUJRmZScfpwhrVIjdEVMBEp4dj-4EjJiGNUwkjFCM9MN0jWZCMwg0hmZB17glJYVUdR0SjpoHjDEtcjCJjEMRdTD4wJQV8+pXgL5opO44pz5ooglopIU4gtjbE+jpV0BXRf9WA8QwAqsIAqjEShDV9USBRVDPgglKdldog0g+RIUCTmF4EBihiRixj+BYSY5XirUQpkTgi0SmSTiEhUM3gKg0xnY8585CjD9ii2CIYelqw9juDfCjjtlcxaZGj4JgiEJS9VSWCwSNShItT6Jni4T69TDdJuQRwow7puZ0xgUygW0dtcC1IrVuZuSkUUVoT8YqjnTOZXS3hkiLZAhu05R7Z2NUI0MPcgyGVkVpo+ThjRiGBxjqSXj4SH0XSgRoyZRYzZcN9XpYywlOpyggz31wNy1INK0dSDjCUKDcgAzaY4hO8kpLjUobj4sQNpoGzS0INZ17SRT4TsDvhkilCQQVD18OZhCS8LUNj6ywMxymyM0Kj8yHTZ8Hhe1i9Wle4rVg119IU4IRxg0cw1ELYNyJ1Gyv1myf0syBTcyhS9ypzHTDyZNjzH1utzzakKgZMLYoxDyFFcIByLSoieNVMA9KMvDcIZxShYJVxahcxUg+pzTaEJsj90dqtNcbsTDnhYJmZFMyUlx8JpTUwqgQg2tEg3YPp2YrVdCNdQzjCCzHSL58gIthDgh6YeLgU5dIVngkxIwLYEgmgmggA */
    context: initialContext,
    id: 'DatasetQualityController',
    initial: 'initializing',
    states: {
      initializing: {
        invoke: {
          src: 'loadDatasetTypesPrivileges',
          onDone: [
            {
              target: 'main',
              actions: ['storeAuthorizedDatasetTypes'],
              guard: 'hasAuthorizedTypes',
            },
            {
              target: 'emptyState',
            },
          ],
          onError: {
            target: 'initializationFailed',
            actions: ['notifyFetchDatasetTypesPrivilegesFailed'],
          },
        },
      },
      initializationFailed: {},
      emptyState: {},
      main: {
        type: 'parallel',
        states: {
          stats: {
            type: 'parallel',
            states: {
              datasets: {
                initial: 'fetching',
                states: {
                  fetching: {
                    invoke: {
                      src: 'loadDataStreamStats',
                      input: ({ context }) => context,
                      onDone: {
                        target: 'loaded',
                        actions: ['storeDataStreamStats', 'storeDatasets'],
                      },
                      onError: {
                        target: 'loaded',
                        actions: ['notifyFetchDatasetStatsFailed'],
                      },
                    },
                  },
                  loaded: {},
                },
                on: {
                  UPDATE_TIME_RANGE: {
                    target: '.fetching',
                    actions: ['storeTimeRange'],
                  },
                  REFRESH_DATA: {
                    target: '.fetching',
                  },
                },
              },
              degradedDocs: {
                initial: 'fetching',
                states: {
                  fetching: {
                    invoke: {
                      src: 'loadDegradedDocs',
                      input: ({ context }) => context,
                      onDone: {
                        target: 'loaded',
                        actions: ['storeDegradedDocStats', 'storeDatasets'],
                      },
                      onError: [
                        {
                          target: 'unauthorized',
                          guard: 'checkIfActionForbidden',
                        },
                        {
                          target: 'loaded',
                          actions: ['notifyFetchDegradedStatsFailed'],
                        },
                      ],
                    },
                  },
                  loaded: {},
                  unauthorized: { type: 'final' },
                },
                on: {
                  UPDATE_TIME_RANGE: {
                    target: '.fetching',
                    actions: ['storeTimeRange'],
                  },
                  REFRESH_DATA: {
                    target: '.fetching',
                  },
                },
              },
              failedDocs: {
                initial: 'fetching',
                states: {
                  fetching: {
                    invoke: {
                      src: 'loadFailedDocs',
                      input: ({ context }) => context,
                      onDone: {
                        target: 'loaded',
                        actions: ['storeFailedDocStats', 'storeDatasets'],
                      },
                      onError: [
                        {
                          target: 'notImplemented',
                          guard: 'checkIfNotImplemented',
                        },
                        {
                          target: 'unauthorized',
                          guard: 'checkIfActionForbidden',
                        },
                        {
                          target: 'loaded',
                          actions: ['notifyFetchFailedStatsFailed'],
                        },
                      ],
                    },
                  },
                  loaded: {},
                  notImplemented: {},
                  unauthorized: { type: 'final' },
                },
                on: {
                  UPDATE_TIME_RANGE: {
                    target: '.fetching',
                    actions: ['storeTimeRange'],
                  },
                  REFRESH_DATA: {
                    target: '.fetching',
                  },
                },
              },
              docsStats: {
                initial: 'fetching',
                states: {
                  fetching: {
                    ...generateInvokePerType(),
                  },
                  loaded: {},
                  unauthorized: { type: 'final' },
                },
                on: {
                  SAVE_TOTAL_DOCS_STATS: {
                    target: '.loaded',
                    actions: ['storeTotalDocStats', 'storeDatasets'],
                  },
                  NOTIFY_TOTAL_DOCS_STATS_FAILED: [
                    {
                      target: '.unauthorized',
                      guard: 'checkIfActionForbidden',
                    },
                    {
                      target: '.loaded',
                      actions: ['notifyFetchTotalDocsFailed'],
                    },
                  ],
                  UPDATE_TIME_RANGE: {
                    target: '.fetching',
                    actions: ['storeTimeRange'],
                  },
                  REFRESH_DATA: {
                    target: '.fetching',
                  },
                },
              },
              nonAggregatableDatasets: {
                initial: 'fetching',
                states: {
                  fetching: {
                    invoke: {
                      src: 'loadNonAggregatableDatasets',
                      input: ({ context }) => context,
                      onDone: {
                        target: 'loaded',
                        actions: ['storeNonAggregatableDatasets'],
                      },
                      onError: [
                        {
                          target: 'unauthorized',
                          guard: 'checkIfActionForbidden',
                        },
                        {
                          target: 'loaded',
                          actions: ['notifyFetchNonAggregatableDatasetsFailed'],
                        },
                      ],
                    },
                  },
                  loaded: {},
                  unauthorized: { type: 'final' },
                },
                on: {
                  UPDATE_TIME_RANGE: {
                    target: '.fetching',
                  },
                  REFRESH_DATA: {
                    target: '.fetching',
                  },
                },
              },
            },
          },
          integrations: {
            initial: 'fetching',
            states: {
              fetching: {
                invoke: {
                  src: 'loadIntegrations',
                  onDone: {
                    target: 'loaded',
                    actions: ['storeIntegrations', 'storeDatasets'],
                  },
                  onError: {
                    target: 'loaded',
                    actions: [
                      'notifyFetchIntegrationsFailed',
                      'storeEmptyIntegrations',
                      'storeDatasets',
                    ],
                  },
                },
              },
              loaded: {
                on: {
                  UPDATE_TABLE_CRITERIA: {
                    target: 'loaded',
                    actions: ['storeTableOptions'],
                  },
                  TOGGLE_INACTIVE_DATASETS: {
                    target: 'loaded',
                    actions: ['storeInactiveDatasetsVisibility', 'resetPage'],
                  },
                  TOGGLE_FULL_DATASET_NAMES: {
                    target: 'loaded',
                    actions: ['storeFullDatasetNamesVisibility'],
                  },
                },
              },
            },
            on: {
              UPDATE_TIME_RANGE: {
                target: '.fetching',
                actions: ['storeTimeRange'],
              },
              REFRESH_DATA: {
                target: '.fetching',
              },
              UPDATE_INTEGRATIONS: {
                target: '.loaded',
                actions: ['storeIntegrationsFilter'],
              },
              UPDATE_NAMESPACES: {
                target: '.loaded',
                actions: ['storeNamespaces'],
              },
              UPDATE_QUALITIES: {
                target: '.loaded',
                actions: ['storeQualities'],
              },
              UPDATE_TYPES: {
                target: '#DatasetQualityController.main.stats',
                actions: ['storeTypes'],
              },
              UPDATE_QUERY: {
                actions: ['storeQuery'],
              },
            },
          },
          failureStoreUpdate: {
            initial: 'idle',
            states: {
              idle: {
                on: {
                  UPDATE_FAILURE_STORE: {
                    target: 'updating',
                  },
                },
              },
              updating: {
                invoke: {
                  src: 'updateFailureStore',
                  input: ({ context, event }) => ({ context, event }),
                  onDone: {
                    target: '#DatasetQualityController.main.stats.datasets.fetching',
                    actions: ['notifyUpdateFailureStoreSuccess'],
                  },
                  onError: {
                    target: 'idle',
                    actions: ['notifyUpdateFailureStoreFailed'],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

export interface DatasetQualityControllerStateMachineDependencies {
  initialContext?: DatasetQualityControllerContext;
  toasts: IToasts;
  dataStreamStatsClient: IDataStreamsStatsClient;
  isDatasetQualityAllSignalsAvailable: boolean;
}

const getValidDatasetTypes = (
  context: DatasetQualityControllerContext,
  isDatasetQualityAllSignalsAvailable: boolean
) =>
  (isDatasetQualityAllSignalsAvailable
    ? context.filters.types.length
      ? context.filters.types
      : context.authorizedDatasetTypes
    : [DEFAULT_DATASET_TYPE]) as DataStreamType[];

const isTypeSelected = (type: DataStreamType, context: DatasetQualityControllerContext) =>
  (context.filters.types.length === 0 && context.authorizedDatasetTypes.includes(type)) ||
  context.filters.types.includes(type);

export const createDatasetQualityControllerStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  toasts,
  dataStreamStatsClient,
  isDatasetQualityAllSignalsAvailable,
}: DatasetQualityControllerStateMachineDependencies) =>
  createPureDatasetQualityControllerStateMachine(initialContext).provide({
    actions: {
      storeAuthorizedDatasetTypes: assign(({ context, event }) => {
        if (!('output' in event)) return {};
        const output = event.output as GetDataStreamsTypesPrivilegesResponse;
        const authorizedDatasetTypes = extractAuthorizedDatasetTypes(output.datasetTypesPrivileges);
        const filterTypes = context.filters.types as DataStreamType[];
        const validTypes = filterTypes.filter(
          (type) => authorizedDatasetTypes.includes(type) && KNOWN_TYPES.includes(type)
        );
        return {
          filters: {
            ...context.filters,
            types: validTypes,
          },
          authorizedDatasetTypes,
        };
      }),
      storeDataStreamStats: assign(({ event }) => {
        if (!('output' in event)) return {};
        const output = event.output as DataStreamStatServiceResponse;
        return {
          dataStreamStats: output.dataStreamsStats as DataStreamStat[],
          datasetUserPrivileges: output.datasetUserPrivileges,
        };
      }),
      storeTotalDocStats: assign(({ context, event }) => {
        if (!('data' in event) || !('dataStreamType' in event)) return {};
        return {
          totalDocsStats: {
            ...context.totalDocsStats,
            [event.dataStreamType]: event.data,
          },
        };
      }),
      storeDegradedDocStats: assign(({ event }) => {
        if (!('output' in event)) return {};
        return { degradedDocStats: event.output as DataStreamDocsStat[] };
      }),
      storeFailedDocStats: assign(({ event }) => {
        if (!('output' in event)) return {};
        return { failedDocStats: event.output as DataStreamDocsStat[] };
      }),
      storeNonAggregatableDatasets: assign(({ event }) => {
        if (!('output' in event)) return {};
        const output = event.output as NonAggregatableDatasets;
        return { nonAggregatableDatasets: output.datasets };
      }),
      storeIntegrations: assign(({ event }) => {
        if (!('output' in event)) return {};
        return { integrations: event.output as Integration[] };
      }),
      notifyFetchDatasetTypesPrivilegesFailed: ({ event }) => {
        if ('error' in event)
          fetchDatasetTypesPrivilegesFailedNotifier(toasts, event.error as Error);
      },
      notifyFetchDatasetStatsFailed: ({ event }) => {
        if ('error' in event) fetchDatasetStatsFailedNotifier(toasts, event.error as Error);
      },
      notifyFetchDegradedStatsFailed: ({ event }) => {
        if ('error' in event) fetchDegradedStatsFailedNotifier(toasts, event.error as Error);
      },
      notifyFetchNonAggregatableDatasetsFailed: ({ event }) => {
        if ('error' in event)
          fetchNonAggregatableDatasetsFailedNotifier(toasts, event.error as Error);
      },
      notifyFetchIntegrationsFailed: ({ event }) => {
        if ('error' in event) fetchIntegrationsFailedNotifier(toasts, event.error as Error);
      },
      notifyFetchTotalDocsFailed: ({ event }) => {
        if ('error' in event) fetchTotalDocsFailedNotifier(toasts, event.error as Error, {});
      },
      notifyFetchFailedStatsFailed: ({ event }) => {
        if ('error' in event) fetchFailedStatsFailedNotifier(toasts, event.error as Error);
      },
      notifyUpdateFailureStoreSuccess: () => updateFailureStoreSuccessNotifier(toasts),
      notifyUpdateFailureStoreFailed: ({ event }) => {
        if ('error' in event) updateFailureStoreFailedNotifier(toasts, event.error as Error);
      },
    },
    actors: {
      loadDatasetTypesPrivileges: fromPromise(async () => {
        return dataStreamStatsClient.getDataStreamsTypesPrivileges({
          types: KNOWN_TYPES,
        });
      }),
      loadDataStreamStats: fromPromise(
        async ({ input }: { input: DatasetQualityControllerContext }) => {
          return dataStreamStatsClient.getDataStreamsStats({
            types: getValidDatasetTypes(input, isDatasetQualityAllSignalsAvailable),
            datasetQuery: input.filters.query,
          });
        }
      ),
      loadDataStreamDocsStats: fromCallback<
        DatasetQualityControllerEvent,
        { context: DatasetQualityControllerContext; type: DataStreamType }
      >(({ sendBack, input }) => {
        const { context, type } = input;
        const fetchDocs = async () => {
          try {
            const { startDate: start, endDate: end } = getDateISORange(context.filters.timeRange);
            const totalDocsStats = await (isTypeSelected(type, context)
              ? dataStreamStatsClient.getDataStreamsTotalDocs({ type, start, end })
              : Promise.resolve([]));
            sendBack({ type: 'SAVE_TOTAL_DOCS_STATS', data: totalDocsStats, dataStreamType: type });
          } catch (e) {
            sendBack({ type: 'NOTIFY_TOTAL_DOCS_STATS_FAILED', data: e as Error });
          }
        };
        fetchDocs();
      }),
      loadDegradedDocs: fromPromise(
        async ({ input }: { input: DatasetQualityControllerContext }) => {
          const { startDate: start, endDate: end } = getDateISORange(input.filters.timeRange);
          return dataStreamStatsClient.getDataStreamsDegradedStats({
            types: getValidDatasetTypes(input, isDatasetQualityAllSignalsAvailable),
            datasetQuery: input.filters.query,
            start,
            end,
          });
        }
      ),
      loadFailedDocs: fromPromise(async ({ input }: { input: DatasetQualityControllerContext }) => {
        const { startDate: start, endDate: end } = getDateISORange(input.filters.timeRange);
        return dataStreamStatsClient.getDataStreamsFailedStats({
          types: getValidDatasetTypes(input, isDatasetQualityAllSignalsAvailable),
          datasetQuery: input.filters.query,
          start,
          end,
        });
      }),
      loadNonAggregatableDatasets: fromPromise(
        async ({ input }: { input: DatasetQualityControllerContext }) => {
          const { startDate: start, endDate: end } = getDateISORange(input.filters.timeRange);
          return dataStreamStatsClient.getNonAggregatableDatasets({
            types: getValidDatasetTypes(input, isDatasetQualityAllSignalsAvailable),
            start,
            end,
          });
        }
      ),
      loadIntegrations: fromPromise(async () => {
        return dataStreamStatsClient.getIntegrations();
      }),
      updateFailureStore: fromPromise(
        async ({
          input,
        }: {
          input: { context: DatasetQualityControllerContext; event: DatasetQualityControllerEvent };
        }): Promise<void> => {
          const { event } = input;
          if (
            'dataStream' in event &&
            event.dataStream &&
            event.dataStream.hasFailureStore !== undefined
          ) {
            await dataStreamStatsClient.updateFailureStore({
              dataStream: event.dataStream.rawName,
              failureStoreEnabled: event.dataStream.hasFailureStore,
              customRetentionPeriod: event.dataStream.customRetentionPeriod,
            });
          }
        }
      ),
    },
  });

export type DatasetQualityControllerStateService = ActorRefFrom<
  ReturnType<typeof createDatasetQualityControllerStateMachine>
>;
