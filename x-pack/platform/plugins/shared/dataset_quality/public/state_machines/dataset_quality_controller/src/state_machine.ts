/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core/public';
import { getDateISORange } from '@kbn/timerange';
import type { DoneInvokeEvent, InterpreterFrom } from 'xstate';
import { assign, createMachine } from 'xstate';
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
import type {
  DatasetQualityControllerContext,
  DatasetQualityControllerEvent,
  DatasetQualityControllerTypeState,
} from './types';

const getValidDatasetTypes = (
  context: DatasetQualityControllerContext,
  isDatasetQualityAllSignalsAvailable: boolean
) =>
  (isDatasetQualityAllSignalsAvailable
    ? context.filters.types.length
      ? context.filters.types
      : context.authorizedDatasetTypes
    : [DEFAULT_DATASET_TYPE]) as DataStreamType[];

const extractAuthorizedDatasetTypes = (datasetTypesPrivileges: DatasetTypesPrivileges) =>
  Object.entries(datasetTypesPrivileges)
    .filter(([_type, priv]) => priv.canMonitor || priv.canRead)
    .map(([type, _priv]) => type.replace(/-\*-\*$/, '')) as DataStreamType[];

const generateInvokePerType = ({ src }: { src: string }) => {
  return {
    invoke: KNOWN_TYPES.map((type) => ({
      id: `${type}`,
      src,
      data: { type },
    })),
  };
};

const isTypeSelected = (type: DataStreamType, context: DatasetQualityControllerContext) =>
  (context.filters.types.length === 0 && context.authorizedDatasetTypes.includes(type)) ||
  context.filters.types.includes(type);

export const createPureDatasetQualityControllerStateMachine = (
  initialContext: DatasetQualityControllerContext
) =>
  createMachine<
    DatasetQualityControllerContext,
    DatasetQualityControllerEvent,
    DatasetQualityControllerTypeState
  >(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOhNrJOJIC8uUAMQQ6YTrQBu1ANYS0mbHkKkKNekxZtJPPoNpQEXGQGMMJOgG0ADAF1bdxKAAO1WDzrOQAD0QBmAA5-dgBWQIBOACYAdgiANniI0IBGfxSAGhByRCj49hSAFht-KJtQm0CYlPjQwqiAXwasxSwcAj51OkZmVg4uPVIDETFaCRM5BQw2lU6qbq0+3XReIaFjaWpzFet7KxSnJBA3Dx3abz8EKpt2fxioiv9-aMLQ6Kycq5Tb+pSYwPCMTiUSqTRa02UHTU800vR0AxW+iEwjYTA4LiIGAAZtQGABbditSGqMgwnrafrcRFrQwbMwWXYOezeE6ec5HS5FG6BSKBQoRGo8mp1D65J7sf6JRI2BIpPJ1MEgIntEldWEU9h41BcdiwTDoWDsCAQnCwYQAVQACsgAIIAFQAogB9O0ASQAss6AEo2gByAHEHY4We42RdEEUYqEJVFincKoDQjFRQgUilghK4pF4tVahUIorlbNoRpyUstTq9RhDcalKbhF6HQAxRsAZQAEk7bXabcGjqyzuHU4UozG41HylUkym0+LkoU7rG7kUoo1mkqTcXSaXFjoK7Rdfqa5vDVicKYABbI0bjTbyQmbqHbhZwjj7w-Vo0n9hn9CX9YTNsli0I4fauKGg4chGCRRLcNjxGm8GBLGwTJtkEZlNGkQRDYxShEk-xRoWj6qmSu5vtqB5VgaX51jRv7-oYKIMGi7AYtiuIEkWT5qmWe6UR+NG1jMp7nletKAQyIF7My-YQcBQ4pDBcEISkSEoXcM6zmENjpskDzlPcxF0TxZGvpqAnUTWYBQAwqAQJAyBbGaVrds6bqek6PoBkGsngacClQcOo73OOCZTmhnwpKk3wxK8Dz1IEtQRIUxkzKZO7me+VlGjZdkORATmmGajYtg6HZdvavZ+cc8leEFkbRqFJQTomkURoUCHsAKEQxP4NgDdUAL+GlxJzJlGrZUeuW2fZjnOT+YnXuIkgyPe3GkRN5aWdNDmzQVRWiX+4lGJJZygTVA6BaAnIJDcIJpIUan9TUTwzqEeQSnUhTIaUTyVPEo0quNL6TTtn57fl83FYtx3IqiuJsZi6A4viD4mZtoPbZWu15XNhULQxJ10lsUkXYc-lhg1d3sA9-hPSUunxG96GpvErzsDyEQ8kE6ZSkDW68eRFk4xDeMHYTS1MQj6LI6jXEkSD6rY1RuP7dDR2MadmxAYy+wU7VAX1Td0HxPdgSPc9TMs1FC6FLcSZPDEA3FBEI3rhtSt8RRov0dqrAE8VFrWva7ket6fqBmBhtUybwVNbGLXhVG7UICnYSlFGNSxHUUQFh7isllj-G+6e-saw2zZtp23bVQbV3G74HUhYn8aTinKbOzEEo2PcsT0xb9NruCGNe8LU2fli5eB5rJ2iCtEzrYXz7KyXquT9Ph2w1rJO69JTL13V7Jx0pnUFBEbuPXFukAimqGc0lSQAgzAqBALGXFz769+yQAdb0T8MWKI3YijTi6N0qY1Xl-QSZdf4a23sTM6wFyYhiNsfJuqYUr5CUpfem190yhBTMkbuNhVxqQGv4dm-Jh4blHkXKBItv6wL-pLOG0sgGyw4mjT29DvaMJgT+TerCd5IL1gcVBscMGn2wRfdIeDigEJTE-dgiRQj0zuEkfqaj36QL4RPH+LCYYAPYaxEB8twFjV4ePcGBj4HGO1vSc6ewoiHzQYpLB59cEjgUbfVmcVow-WSGoshVR4g0J4SvPRNiazOVbEeYQrYbQADV3IAHkewABkuypMoK2J0rYex2lbNHBu6DOQjgTmFdu05WZlGSAUBcvdeq4WqE8HRY8srRKNLE+Jvp0muibAATRdOkm0WTkA5LyQU+0eSmw2ldBkh0yASlH0UhUscSdqmp3TLhFRyR0xPDzvBIE7SrGdNLt04qcTqzCD6W6IZIzMnZNyfkwpsz5mLOWeIuSbiGrrOam3NqM4L4RAlIUTqoQkwwQvuE5eQtzlMMubAa5Bpg5uRdOHLykdfKuMkeUluVSgWsyUrs+mYT0g8n+ACU5kTrEXLEFc+JpVq6VR7Cs35J9-mt1ahFGcz8whlC7mbPkMR2Y0vhWDC5tA6A2igLZGy0wABGrAiwuRDo6DFnlvJR0uqsv5BLNlEs+K3bqOEzYVFiFEem4qzKSsRdK2gsr5VQCVSqk8lcyoVVruyvFzdKmGt5bU-wdQCi1EqL3EcyEFQFzobShFAiHVOoYAqzAyqwCqoQctMYq1JgWOBmcu1CaZVyuTS61Nbq6KzwAjrMmMlcWQTjmUPO7BKjqOqOmWIYSUyxnTKa7mQRnYymijaraa8i2OpLSm1AaaM32OYqYuWYCIkSpVuOpNU6Z3fnsbvWtB8JENowU20FraFztuQqKqI3aYq3ASNzYoZQ0glBHZ-fhOVE2TrLdOitIlM0mOAYu7hcLbWrrfcW51rr01bqlg40mTiHDfMpgey4R6W3BFPWmc9Xag2fTNnkN2vMkhu2fQw98XB0B4zOGq9FHkI4+R9UhiMH0+U8i+oKqIgp2PM2I1EnUZGKPARKlXcqNcqr0eulIpjxLgiBG6vKSNPJAgRu43Sg8fHZqUbRaHJ0rpfSOn9D6N0qTfTFN1RyiTl7iWuzCPydmCFX7RGU-GtTdkNOuS076G0npWyWhtJQcqYnG6ckk1FCo9sUqKeduQ-qgMY0QI6YW5zUkqNadwOaMZro3T+dM761MwWIxmxuGS-kxRKj3F0o5hL9B+N0GSxqu0gzLRZfreJzkVqZMLitcE+4dxervSeuwX4fwkoDs6jFkecWC2rsS659VzpUsOi9IMgLZTEBJm7k8NR5Qh4fUoTOWM9tkLBH7uCj6vUKtTaq+pgTv6RgLzvFMWNK6x3Teu9u0R+9ltDjCbBYhuEh3xEU3kGccUQh1CTOUaFsRzvPcuy5170H53-q4QrR7wGYfkauzVm7O64OfaCt97q4PXaClIfEPlYSVEWzUv4w7rxofQJe1jog1B8aabqzaAAQosp0lAvQZYW66Ou+6WuIBeGEAH97O1RiqHy3SBRIVqL+ilcooR6f8MZ7QQ0zPWd2lSf6f03OdO+bdCk1lNpWwOiKXjuOOFu4IQBOx6ICF7gzhzMe9MFtXi6UoaKtXpHYdJfYNrgqwhdf6+502c0GTxlVQt3aJ0HmvPW4wZEbuyEAeO90n8AH70MxhJKDhN4ec1Gq8VNKhy8AjjLrRwwYXgXEAAFpYywX6mUYIN8BR9RTA35mPc1GSmZht4dsXLFxo1AiVYAghB15WwgBvp84Jt5epEP4-hu0hGd5tpI+FdI-TfiP-NY+lgT-0FJJs08Z9DnSFhU+ZRdLRDkWT1mA8HaQoGjnCXKQ1dgDxC4CgKKwBL8goL4wsBREhXhs4OsUw5FOZKEpx6gYoAY-dKIgC458IUw7YCg-hSFggigfo0xkDS5UCpEesNlAVA1PgPpvgFwL5UgUp8IgQv8D9BYa9X1doTxiDylYgyCeUO5iVScCh-heoaglINFCDEVhJlAq1DBOCIxIsVEZROpDspdCFiU5QmphVcIqF-txCBFJDTQg8WcCpZCEAyFu5Fdeo3ZfhIgtJ6haYC94xwUHg7hdCcpIZ8ZDoTCVxu4AVeCakoo8EW16Z8IigqhYxfdmCP4SMul3CJYjFoMvD5CzYsFlDRUowZxXgQh7gEJvsihHp99xtR8ntoE3DxZ4Fg9IATC2sbgkhopdJ8I3Yc9LNe8Ices84gQ4oYhXC1YoYZ52B8BaBUB8B0ALxcQBBKifkctqi9k6jopNEmiop2YQh0hcIcIahmZC9uiN44EZ4vD6gfDuVk5-DEBhUJRmZScfpwhrVIjdEVMBEp4dj-4EjJiGNUwkjFCM9MN0jWZCMwg0hmZB17glJYVUdR0SjpoHjDEtcjCJjEMRdTD4wJQV8+pXgL5opO44pz5ooglopIU4gtjbE+jpV0BXRf9WA8QwAqsIAqjEShDV9USBRVDPgglKdldog0g+RIUCTmF4EBihiRixj+BYSY5XirUQpkTgi0SmSTiEhUM3gKg0xnY8585CjD9ii2CIYelqw9juDfCjjtlcxaZGj4JgiEJS9VSWCwSNShItT6Jni4T69TDdJuQRwow7puZ0xgUygW0dtcC1IrVuZuSkUUVoT8YqjnTOZXS3hkiLZAhu05R7Z2NUI0MPcgyGVkVpo+ThjRiGBxjqSXj4SH0XSgRoyZRYzZcN9XpYywlOpyggz31wNy1INK0dSDjCUKDcgAzaY4hO8kpLjUobj4sQNpoGzS0INZ17SRT4TsDvhkilCQQVD18OZhCS8LUNj6ywMxymyM0Kj8yHTZ8Hhe1i9Wle4rVg119IU4IRxg0cw1ELYNyJ1Gyv1myf0syBTcyhS9ypzHTDyZNjzH1utzzakKgZMLYoxDyFFcIByLSoieNVMA9KMvDcIZxShYJVxahcxUg+pzTaEJsj90dqtNcbsTDnhYJmZFMyUlx8JpTUwqgQg2tEg3YPp2YrVdCNdQzjCCzHSL58gIthDgh6YeLgU5dIVngkxIwLYEgmgmggA */
      context: initialContext,
      predictableActionArguments: true,
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
                cond: 'hasAuthorizedTypes',
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
                      target: 'datasets.fetching',
                      actions: ['storeTimeRange'],
                    },
                    REFRESH_DATA: {
                      target: 'datasets.fetching',
                    },
                  },
                },
                degradedDocs: {
                  initial: 'fetching',
                  states: {
                    fetching: {
                      invoke: {
                        src: 'loadDegradedDocs',
                        onDone: {
                          target: 'loaded',
                          actions: ['storeDegradedDocStats', 'storeDatasets'],
                        },
                        onError: [
                          {
                            target: 'unauthorized',
                            cond: 'checkIfActionForbidden',
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
                      target: 'degradedDocs.fetching',
                      actions: ['storeTimeRange'],
                    },
                    REFRESH_DATA: {
                      target: 'degradedDocs.fetching',
                    },
                  },
                },
                failedDocs: {
                  initial: 'fetching',
                  states: {
                    fetching: {
                      invoke: {
                        src: 'loadFailedDocs',
                        onDone: {
                          target: 'loaded',
                          actions: ['storeFailedDocStats', 'storeDatasets'],
                        },
                        onError: [
                          {
                            target: 'notImplemented',
                            cond: 'checkIfNotImplemented',
                          },
                          {
                            target: 'unauthorized',
                            cond: 'checkIfActionForbidden',
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
                      target: 'failedDocs.fetching',
                      actions: ['storeTimeRange'],
                    },
                    REFRESH_DATA: {
                      target: 'failedDocs.fetching',
                    },
                  },
                },
                docsStats: {
                  initial: 'fetching',
                  states: {
                    fetching: {
                      ...generateInvokePerType({
                        src: 'loadDataStreamDocsStats',
                      }),
                    },
                    loaded: {},
                    unauthorized: { type: 'final' },
                  },
                  on: {
                    SAVE_TOTAL_DOCS_STATS: {
                      target: 'docsStats.loaded',
                      actions: ['storeTotalDocStats', 'storeDatasets'],
                    },
                    NOTIFY_TOTAL_DOCS_STATS_FAILED: [
                      {
                        target: 'docsStats.unauthorized',
                        cond: 'checkIfActionForbidden',
                      },
                      {
                        target: 'docsStats.loaded',
                        actions: ['notifyFetchTotalDocsFailed'],
                      },
                    ],
                    UPDATE_TIME_RANGE: {
                      target: 'docsStats.fetching',
                      actions: ['storeTimeRange'],
                    },
                    REFRESH_DATA: {
                      target: 'docsStats.fetching',
                    },
                  },
                },
                nonAggregatableDatasets: {
                  initial: 'fetching',
                  states: {
                    fetching: {
                      invoke: {
                        src: 'loadNonAggregatableDatasets',
                        onDone: {
                          target: 'loaded',
                          actions: ['storeNonAggregatableDatasets'],
                        },
                        onError: [
                          {
                            target: 'unauthorized',
                            cond: 'checkIfActionForbidden',
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
                      target: 'nonAggregatableDatasets.fetching',
                    },
                    REFRESH_DATA: {
                      target: 'nonAggregatableDatasets.fetching',
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
                  target: 'integrations.fetching',
                  actions: ['storeTimeRange'],
                },
                REFRESH_DATA: {
                  target: 'integrations.fetching',
                },
                UPDATE_INTEGRATIONS: {
                  target: 'integrations.loaded',
                  actions: ['storeIntegrationsFilter'],
                },
                UPDATE_NAMESPACES: {
                  target: 'integrations.loaded',
                  actions: ['storeNamespaces'],
                },
                UPDATE_QUALITIES: {
                  target: 'integrations.loaded',
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
    },
    {
      actions: {
        storeTableOptions: assign((_context, event) => {
          return 'dataset_criteria' in event
            ? {
                table: event.dataset_criteria,
              }
            : {};
        }),
        resetPage: assign((context, _event) => ({
          table: {
            ...context.table,
            page: 0,
          },
        })),
        storeInactiveDatasetsVisibility: assign((context, _event) => {
          return {
            filters: {
              ...context.filters,
              inactive: !context.filters.inactive,
            },
          };
        }),
        storeFullDatasetNamesVisibility: assign((context, _event) => {
          return {
            filters: {
              ...context.filters,
              fullNames: !context.filters.fullNames,
            },
          };
        }),
        storeTimeRange: assign((context, event) => {
          return 'timeRange' in event
            ? {
                filters: {
                  ...context.filters,
                  timeRange: event.timeRange,
                },
              }
            : {};
        }),
        storeIntegrationsFilter: assign((context, event) => {
          return 'integrations' in event
            ? {
                filters: {
                  ...context.filters,
                  integrations: event.integrations,
                },
              }
            : {};
        }),
        storeNamespaces: assign((context, event) => {
          return 'namespaces' in event
            ? {
                filters: {
                  ...context.filters,
                  namespaces: event.namespaces,
                },
              }
            : {};
        }),
        storeQualities: assign((context, event) => {
          return 'qualities' in event
            ? {
                filters: {
                  ...context.filters,
                  qualities: event.qualities,
                },
              }
            : {};
        }),
        storeTypes: assign((context, event) => {
          return 'types' in event
            ? {
                filters: {
                  ...context.filters,
                  types: event.types,
                },
              }
            : {};
        }),
        storeQuery: assign((context, event) => {
          return 'query' in event
            ? {
                filters: {
                  ...context.filters,
                  query: event.query,
                },
              }
            : {};
        }),
        storeAuthorizedDatasetTypes: assign(
          (context, event: DoneInvokeEvent<GetDataStreamsTypesPrivilegesResponse>) => {
            const authorizedDatasetTypes = extractAuthorizedDatasetTypes(
              event.data.datasetTypesPrivileges
            );

            const filterTypes = context.filters.types as DataStreamType[];

            // This is to prevent the user from selecting types that are not authorized through the url
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
          }
        ),
        storeDataStreamStats: assign(
          (_context, event: DoneInvokeEvent<DataStreamStatServiceResponse>) => {
            const dataStreamStats = event.data.dataStreamsStats as DataStreamStat[];
            const datasetUserPrivileges = event.data.datasetUserPrivileges;

            return {
              dataStreamStats,
              datasetUserPrivileges,
            };
          }
        ),
        storeTotalDocStats: assign(
          (context, event: DoneInvokeEvent<DataStreamDocsStat[]>, meta) => {
            const type = meta._event.origin as DataStreamType;

            return {
              totalDocsStats: {
                ...context.totalDocsStats,
                [type]: event.data,
              },
            };
          }
        ),
        storeDegradedDocStats: assign((_context, event: DoneInvokeEvent<DataStreamDocsStat[]>) => ({
          degradedDocStats: event.data,
        })),
        storeFailedDocStats: assign((_context, event: DoneInvokeEvent<DataStreamDocsStat[]>) => ({
          failedDocStats: event.data,
        })),
        storeNonAggregatableDatasets: assign(
          (_context, event: DoneInvokeEvent<NonAggregatableDatasets>) => ({
            nonAggregatableDatasets: event.data.datasets,
          })
        ),
        storeIntegrations: assign((_context, event) => {
          return 'data' in event
            ? {
                integrations: event.data as Integration[],
              }
            : {};
        }),
        storeEmptyIntegrations: assign((_context) => {
          return {
            integrations: [],
          };
        }),
        storeDatasets: assign((context, _event) => {
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
      },
      guards: {
        hasAuthorizedTypes: (_context, event) => {
          return !!(
            'data' in event &&
            typeof event.data === 'object' &&
            event.data &&
            'datasetTypesPrivileges' in event.data &&
            extractAuthorizedDatasetTypes(event.data.datasetTypesPrivileges).length > 0
          );
        },
        checkIfActionForbidden: (_context, event) => {
          return (
            'data' in event &&
            typeof event.data === 'object' &&
            'statusCode' in event.data! &&
            event.data.statusCode === 403
          );
        },
        checkIfNotImplemented: (_context, event) => {
          return (
            'data' in event &&
            typeof event.data === 'object' &&
            'statusCode' in event.data! &&
            event.data.statusCode === 501
          );
        },
      },
    }
  );

export interface DatasetQualityControllerStateMachineDependencies {
  initialContext?: DatasetQualityControllerContext;
  toasts: IToasts;
  dataStreamStatsClient: IDataStreamsStatsClient;
  isDatasetQualityAllSignalsAvailable: boolean;
}

export const createDatasetQualityControllerStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  toasts,
  dataStreamStatsClient,
  isDatasetQualityAllSignalsAvailable,
}: DatasetQualityControllerStateMachineDependencies) =>
  createPureDatasetQualityControllerStateMachine(initialContext).withConfig({
    actions: {
      notifyFetchDatasetTypesPrivilegesFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDatasetTypesPrivilegesFailedNotifier(toasts, event.data),
      notifyFetchDatasetStatsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDatasetStatsFailedNotifier(toasts, event.data),
      notifyFetchDegradedStatsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDegradedStatsFailedNotifier(toasts, event.data),
      notifyFetchNonAggregatableDatasetsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchNonAggregatableDatasetsFailedNotifier(toasts, event.data),
      notifyFetchIntegrationsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchIntegrationsFailedNotifier(toasts, event.data),
      notifyFetchTotalDocsFailed: (_context, event: DoneInvokeEvent<Error>, meta) =>
        fetchTotalDocsFailedNotifier(toasts, event.data, meta),
      notifyFetchFailedStatsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchFailedStatsFailedNotifier(toasts, event.data),
      notifyUpdateFailureStoreSuccess: () => updateFailureStoreSuccessNotifier(toasts),
      notifyUpdateFailureStoreFailed: (_context, event: DoneInvokeEvent<Error>) =>
        updateFailureStoreFailedNotifier(toasts, event.data),
    },
    services: {
      loadDatasetTypesPrivileges: () => {
        return dataStreamStatsClient.getDataStreamsTypesPrivileges({
          types: KNOWN_TYPES,
        });
      },
      loadDataStreamStats: (context, _event) => {
        return dataStreamStatsClient.getDataStreamsStats({
          types: getValidDatasetTypes(context, isDatasetQualityAllSignalsAvailable),
          datasetQuery: context.filters.query,
        });
      },
      loadDataStreamDocsStats:
        (context, _event, { data: { type } }) =>
        async (send) => {
          try {
            const { startDate: start, endDate: end } = getDateISORange(context.filters.timeRange);

            const totalDocsStats = await (isTypeSelected(type, context)
              ? dataStreamStatsClient.getDataStreamsTotalDocs({
                  type,
                  start,
                  end,
                })
              : Promise.resolve([]));

            send({
              type: 'SAVE_TOTAL_DOCS_STATS',
              data: totalDocsStats,
            });
          } catch (e) {
            send({
              type: 'NOTIFY_TOTAL_DOCS_STATS_FAILED',
              data: e,
            });
          }
        },
      loadDegradedDocs: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.filters.timeRange);

        return dataStreamStatsClient.getDataStreamsDegradedStats({
          types: getValidDatasetTypes(context, isDatasetQualityAllSignalsAvailable),
          datasetQuery: context.filters.query,
          start,
          end,
        });
      },
      loadFailedDocs: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.filters.timeRange);

        return dataStreamStatsClient.getDataStreamsFailedStats({
          types: getValidDatasetTypes(context, isDatasetQualityAllSignalsAvailable),
          datasetQuery: context.filters.query,
          start,
          end,
        });
      },
      loadNonAggregatableDatasets: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.filters.timeRange);

        return dataStreamStatsClient.getNonAggregatableDatasets({
          types: getValidDatasetTypes(context, isDatasetQualityAllSignalsAvailable),
          start,
          end,
        });
      },
      loadIntegrations: () => {
        return dataStreamStatsClient.getIntegrations();
      },
      updateFailureStore: (_context, event) => {
        if (
          'dataStream' in event &&
          event.dataStream &&
          event.dataStream.hasFailureStore !== undefined
        ) {
          return dataStreamStatsClient.updateFailureStore({
            dataStream: event.dataStream.rawName,
            failureStoreEnabled: event.dataStream.hasFailureStore,
            customRetentionPeriod: event.dataStream.customRetentionPeriod,
          });
        }
        return Promise.resolve();
      },
    },
  });

export type DatasetQualityControllerStateService = InterpreterFrom<
  typeof createDatasetQualityControllerStateMachine
>;
