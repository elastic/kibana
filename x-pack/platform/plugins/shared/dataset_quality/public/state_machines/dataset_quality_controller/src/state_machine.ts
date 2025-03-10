/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { getDateISORange } from '@kbn/timerange';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
import {
  DataStreamDocsStat,
  DataStreamStat,
  NonAggregatableDatasets,
} from '../../../../common/api_types';
import { KNOWN_TYPES } from '../../../../common/constants';
import { DataStreamStatServiceResponse } from '../../../../common/data_streams_stats';
import { Integration } from '../../../../common/data_streams_stats/integration';
import { DataStreamType } from '../../../../common/types';
import { IDataStreamsStatsClient } from '../../../services/data_streams_stats';
import { generateDatasets } from '../../../utils';
import { fetchNonAggregatableDatasetsFailedNotifier } from '../../common/notifications';
import { DEFAULT_CONTEXT } from './defaults';
import {
  fetchDatasetStatsFailedNotifier,
  fetchDegradedStatsFailedNotifier,
  fetchFailedStatsFailedNotifier,
  fetchIntegrationsFailedNotifier,
  fetchTotalDocsFailedNotifier,
} from './notifications';
import {
  DatasetQualityControllerContext,
  DatasetQualityControllerEvent,
  DatasetQualityControllerTypeState,
} from './types';

const generateInvokePerType = ({ src }: { src: string }) => ({
  invoke: KNOWN_TYPES.map((type) => ({
    id: `${type}`,
    src,
    data: { type },
  })),
});

const isTypeSelected = (type: DataStreamType, context: DatasetQualityControllerContext) =>
  context.filters.types.length === 0 || context.filters.types.includes(type);

export const createPureDatasetQualityControllerStateMachine = (
  initialContext: DatasetQualityControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOlk3VnYgyw5YAYgDKAQQBqAUQD6ycQBVxoxQCVp4gLKzVS0QG0ADAF1EoAA7VYZEnXMgAHogCMANgDMAdnYAONwBMbgAsAKxh3kYAnL4ANCDkiMHBHsHsRgG+vh4xIb6hLgC+hfFomNh4hKQUNPRMLGyc3Lz85ULCAHIA8ooAkgBiAJrySirqmjp6iqKy-eK9ADLSyMZmSCBWNuh2tA7OCO7efoEh4aGRMfGJCCkevunBLsmBOQEeHsWlAhUExGRUdEYzFYHC4GBa33aAFUAAoKRRyPpaORqcQdADi0lWDk2tns632hx8-iCYQiXmicQSSQCwQC6XCRlCQRcHjcLlCnxAZUElT+NUB9RBTXBfEhPGEGn6GlEAAkRspsetcdt8aBCZ5iScyecKZdqTcXFEXOwvC5zXcjMEvMFfEUStzxb9qgC6sDGmCeHwwFAGKgIJBkNQAMYiCQyeTSdGo5DLeRdSgzKaGUw46x43YE1ya46ks4XKnXYJRUJRdieKJ0sJRY0FLk8n5Vf61IENUHNb2+-2BkMibp9IaR6PiWPIeOJ3TKaazeZLFap5Xp1WZ9XZo4k07kylXJJuPfsKJeLLsm1eUJW+tOpsCt1tkVegNdgMQIOhzo9AbDWPD0fjpNTmY5kWZYDBcNZLCXHY9jXLU8y3fUi38Dxy2ZIwPGiLwPHOD4HQbHBnWbQV3XbUVHz9Z9XxEWF4URXpkVkVEMSxBcIK2KCswOHMNx1AsdxuLw3B8Pdgk1VIvFrS82j5F0WyFD0OzI7sX17SVpGlaQ5QVcQlVYjNoM49dtXzPVCySM0fA8AIXC8AIAiPay7Uk3kCJvVthU9XhaDocQoF9H0BAAI1YPCJXDORug6WRxHRaMo1GAAhJYtNEaRph0jZILVJwYNzTddW3A0cn8dgglCUJskPDIjScxt+VdNz5NFLzaB8vyoEC4LxT7D9BwiqKYo0dEEqS+EVFSwDZxAliMrYrKNUMuD8oQxBvByErizcNDfCiTbMhq-Dr3quSSK9ZrWoYfzMCCsAQu6gdhj66LYqG5RErkUaUunIC51A8CZr0jiiVyniTL4u4oiMEr7Ih1IRKMIwvH26TCNvdyOzO3yLvaq7Oqkqi4SUWj6MYzF0pVdjVwM2C8t4wqKoPLDvErHaUn8JGXKO4j7087zMcu1Brtu1T1M00aycyldsqp4HjIK65vG29hS1pEIonQ9DOVwq86tkrmSHoH0-WXfGaNkJEUTRUnpvJubEEPPiRJs9gIjso1fAyNwonZw7dbvfX0ENjAdhEKUZXlMXrYl-T7YNETbPYc00NCG0nlZNxvZ1oi-YNrtjeEajCdkXoOgRYc+i6DoUz+m3Jf2GOiyNE0Nb3EI2RtAIM5krPhX9wO84LhFZA6bQNJhcRKA08XZtru2vAdzIfACNWjE2le3nTrWpI532e5zo3g-zgnB9wKFxAWXo+knyPp+jufY7uZDMitc43F8cTxM7lGGo4Xvc4PgfESDBhFfauUdAYuDtM7ZIh5X7WXcA7SyyFHi0m2mhJeWRP6uWOuwX++86Am0LifaQahBhTwBpTKI8dKzRAyDtSyKcHYZFCMcKqm0vA2gKB3Tezkfbd0aLgoO+D2AADMcDBgABb6ygMICAdAwA4NoAAN2oAAa3kSFbefCf570EbQXgoj0ASKkQgfWyjgy6NWGQ5c+lQivz8FkCB8MV55DvkWZkbhTQp3POeBGGDuG1S7qjfhOjjYiLEZI2g0i2BMA4BYIgGBhHUAYAAW3YBo3hQTtEBz-kIgxRjIkmKUSGCxpgrEUylrY+4WQ7Tu3hsJN+DsQgeOSC4IwRoFbMi9v4g6mdMkKOyXgvR7AiDUCUofU2r0kqUDUBfYhvRtLX3IVLfwZZbRGF8LaM0ENHhRAduVNIZU1ZL09hkFImDObZwGbo3gIyxmKC6DFJKxdx59AjB9caZTbYIHyCacIFJrSVjPN4FwDsRImm2lhcS1pU6ay+FvDJ39+l92DsM0Zz5hD3MeXIfoUIFgLGSqlIeI8q5phvhxDZyFWnMzXm-CBrikhsmYRDdk+QNnJ0POcnejRhFEHINQfA6AxDSCWJQRQQ9pAAHUCWKE+TPBANkwYligTWVkNY7R2Q3nCnhvTEU8r5QK4QlAFhdBSrMBYgwuhQhlYs6xHEFUGlpMhN+ORwiPAVncWFjp4U6uwXq-l6AFG2D+AALykTIuR951Ha0Cbq3l-rA3bBDVI2V+lWS0gPBA4IGRLLlTcOVPitI0KmnXiWV+JZHLdORlgrmfqBUJpIEmyJ7AMZtQ6jdcUYTDEROkbI2g8jTGqKjd6mNvq411v1kG0goam0tqxm2kKnb8lQEKWYkpJgU0cQ2ukM0WQSwFCwpkPiTxKwlVsUedeAkbI4S1QEr+o79UBonYmqdUjm281bTjdtUlF3duENEpJ7A4kJKSak9JPqa1jsfbQSdJBp1QDfS1Pm2MBa415D+4xA7zHLksTa8p+wt0IwgdtMqrJmSmQOOVReYQjR0nEoeIInKtEiMg-Wxt8HZ380Fh23tYBxmF2LqIXo6JZTTnNgxS2zFQFkspsyZhZ5X6+CXmmtW9LOLuxKu8Ta7JKF2XeIxvptaoMwbgwh86nHUMVD4HIoVIqxXvOtVJpZ+xPBpCtBDCkR4UiljcEeoqJVPZ0prGeSs9ob09JHRBh9rGX1NtaKgUQjAwCoGSaIHA2xIn6PCWGnjCjlFqLSdGu9kX41PobTF+DcWEsXWS6l9A6WoCZa7RhopWGdg4cc7aymdJ7gcmqW07wbDggFreCaMIngl42jQp5-TsaoulbY2KTAVWkspbS1IxrS6-0MBiYB+J6BEkpIK8Oord5DPRdg6+yriWatrYy+hgpmG10bq65kBO5Usj9YEgjIbDrLJpGSNaR4eaggf0rZogzLH5vlcW-F67q26vrfO8GsAvQQkooEcuZAOBUAkCIBt39OWB35bAxF07kPoPPou7FgQy2bsI7u1D2DKO0dCIxzsLHmBcf4+a6u7DpTcNfLIweEITi0KCSyKEAttL2DvBsoJR4GzFczfvSVinZWqcVZp3D2r9XeCM+R6jq5oS2d0A5zjvH92onbYA0B-bIGjvatJ8KM7+vLta+q-D3XSPmdG-Ryz2gZuueW5XcUvn66BdyqFyzUXbcJcFvYfcVIEuyor0zcr4r461cLaux7nXiP9c++Raz-3aBYDiICqMhgEBueRPDX23Lg6He3urWTubWfoc55W3nhn7emeG6L0Mk3AesDl8r9X4Pj2w-PYqVmhOGzX6e2LLkVTHh3AePYW8MqyCKQr3T631Xxm3dLe17dhr3v+85MHyXkfFfUBV5r1bnbtuDugcKy3535PD-U+P7n0-eve8G7+7-6+6m435j4P4h6tZ0DtakpOaICMhz4iQrJL7+Ar4BClimibQHoRDmiIxg4Ioq6Z5f6a4-5d5-7n5AFIqX6l6j537j55K-r-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-3J3-3WjDaUM7QAm+XeCbIEPMOZm8Hd5n4F4X6DJJ01yppsgFpYHOz0J3CezoQljBAiNI5wm-7sP-7GaCEyNUGDLOE80bKKMQx+DGjwyZCBBmgz1-nZHyXaNElsNe5SOUFD6FF3VU3h3GXiSQysqKYJ5tKKZaOu6uO6PuMCHSPXLGO6IpFwPd1zGKbIRWiFr0ab5S4rxKwWhPCK2sgDlt1b2iMd5ikkOSMxOePX5l5iHV5mM12PW5Ay5TXiTvC+IiThN5GRNkF6MUEgFX4DOiHgHVXJNfJvCq2FTRBIJPBvxWgCTgOONyW5HcFGEVP6MGGGNxNeNgF0EtByI81nUy5hBWSZAljoS0hgytkHjWlMKLUlhdOrPlMSMbO9FbPG41O0HiFE0k3oBk0MAU2HPrLHOYNnOD2XOFToE+AVFNItzoSYSPNAVrMvOelgA82BBgwKxR1o2YSnhmiIssNrOmNjNCVp3XDGidWoLsjWRO1hNLNsUrNIvlPeOUn3Ukupo8P1EezFpnia3JArwbIEtiPwnnH7N9ow2YQeI1g1i2KMUpAM31Fsk+DrL+GWS7pbSaP0soWMuEvMvXWamyNgIUJkuuDiQTX+GA13A0YcpatMY6vCtOH6v5kP482cvXBGhMj93eXWg9lGj0PFNMMuNqkisanOuou32QLGgpDvx03z4FptLNlV1tICRkjSUBsZ6lPoUgWTnYWoAQVQVnkwWGsB2EhGhgzA5R2cLux+FYRCv7mHm5v5unnknnm3Wsvosr5nj0g5CWRBDry2R9XHbLMX31tYXHmQXNtomttitovst2ohCmizPUuoRRWr0fnRmshMKr5pub2Bsm1+1-1fJPBrR0jYSK6UI5CqZvCHjpDCQjatKYSDudEMssaKXWBd2Htyp9vljWmNzIOWQliKP13+EkjGhuz8M2WFBAA */
  createMachine<
    DatasetQualityControllerContext,
    DatasetQualityControllerEvent,
    DatasetQualityControllerTypeState
  >(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'DatasetQualityController',
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
              target: '#DatasetQualityController.stats',
              actions: ['storeTypes'],
            },
            UPDATE_QUERY: {
              actions: ['storeQuery'],
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
  isFailureStoreEnabled: boolean;
}

export const createDatasetQualityControllerStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  toasts,
  dataStreamStatsClient,
  isFailureStoreEnabled,
}: DatasetQualityControllerStateMachineDependencies) =>
  createPureDatasetQualityControllerStateMachine(initialContext).withConfig({
    actions: {
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
    },
    services: {
      loadDataStreamStats: (context, _event) =>
        dataStreamStatsClient.getDataStreamsStats({
          types: context.filters.types as DataStreamType[],
          datasetQuery: context.filters.query,
        }),
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
          types: context.filters.types as DataStreamType[],
          datasetQuery: context.filters.query,
          start,
          end,
        });
      },
      loadFailedDocs: (context) => {
        if (!isFailureStoreEnabled) {
          const unsupportedError = {
            message: 'Failure store is disabled',
            statusCode: 501,
          };
          return Promise.reject(unsupportedError);
        }

        const { startDate: start, endDate: end } = getDateISORange(context.filters.timeRange);

        return dataStreamStatsClient.getDataStreamsFailedStats({
          types: context.filters.types as DataStreamType[],
          datasetQuery: context.filters.query,
          start,
          end,
        });
      },
      loadNonAggregatableDatasets: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.filters.timeRange);

        return dataStreamStatsClient.getNonAggregatableDatasets({
          types: context.filters.types as DataStreamType[],
          start,
          end,
        });
      },
      loadIntegrations: () => {
        return dataStreamStatsClient.getIntegrations();
      },
    },
  });

export type DatasetQualityControllerStateService = InterpreterFrom<
  typeof createDatasetQualityControllerStateMachine
>;
