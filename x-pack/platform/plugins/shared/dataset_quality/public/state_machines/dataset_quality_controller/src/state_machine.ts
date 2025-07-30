/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core/public';
import { getDateISORange } from '@kbn/timerange';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
import {
  DatasetTypesPrivileges,
  DataStreamDocsStat,
  DataStreamStat,
  NonAggregatableDatasets,
} from '../../../../common/api_types';
import { DEFAULT_DATASET_TYPE, KNOWN_TYPES } from '../../../../common/constants';
import {
  DataStreamStatServiceResponse,
  GetDataStreamsTypesPrivilegesResponse,
} from '../../../../common/data_streams_stats';
import { Integration } from '../../../../common/data_streams_stats/integration';
import { DataStreamType } from '../../../../common/types';
import { IDataStreamsStatsClient } from '../../../services/data_streams_stats';
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
} from './notifications';
import {
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
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOhNrJOJIC8uUAMQQ6YTrQBu1ANYS0mbHkKkKNekxZtJPPoNpQEXGQGMMJOgG0ADAF1bdxKAAO1WDzrOQAD0QBmABYARnYAVgBOADZAm0CIgCYbBKjghIAaEHJEAA5Q-wSExKig+OTggF8KzMUsHAI+dTpGZlYOLj1SAxE2Jg4XIgwAM2oGAFt2WuUGtSpmrTbddF4uoWNpanNl63tHbzcPbdpvPwQg0MiYuMTk1IysxGCAdn92J6SbJ+ComODnqLCVRqGDqKkac00rR0Y1QXHYsEw6Fg7AgIOUsGEAFUAArIACCABUAKIAfQJAEkALKkgBKeIAcgBxIl7JAgA6eY5s07BQJPMJvBKxfz8mxhHL8p6ZbIIP45V5PJ4RHLRL4AsI2CJAkBTeqqMgQlraDgwuEIjDI1FKHAYmlEgBidoAygAJEn4gl41mudyck6PPkC97C0XiyXSx7BfyvCJhQIioUi3mFbW6sGzDRGxam2jwxGWtE29hDHCmAAWQlE4kkMnkk0L6YNmYW0NhufNSJRDeRJfQ5bWJk2Fh2Dns+19R39suiCXY-hsqWCC5yQvlUoesqSApVETiYqiESeEsB1R1DZmTfmUJNbbzFq71s7vf7hmEvVG7AGw1GEzTF6akLGuwOZ3p2Vqgj2pYVoY6xmMOtCON67ITpYXKgDyM5zgufzLquIoRrKfyvBqwQqmECQamE7ypue+oAVmrZmvmKJgFADCoBAkDIJsGI4h6pIUtSJJ0kyLJjmyHKTtyAb8oKIaUce64ysEYR-G8gTkXGCQ5ACESBDRj7-oaLY3kx96cWxHFcTxwh2o6RKuu6hJeuJPqHKhU68rJwY2CKCnhhuvKpOwETBIe842J8pFhP4BmgkZzbXsBt4dparHsZxEDcaYkF9tBIhiLQEiDnWf50cZSUgalLGWZl2W5S+RiDlsqGIa5yHuV40nTlENjsNpUYhL5NjfNGBEqSkbxxoEK4FNGNg6XF0zlYlQFVcxFkZdZOXFlBlbvv0gzoCM4z1oZK1XmtKUbelVlZTxu15QOGwtSOSGSR53Vhb1-V5Ocw2jf440xNuKo5PKeQ6T8S16uCq3Ztd5m3XVD3Pvlb4MH0n5HSdv60XDl0I2ZYHI9tDX5bBQ5HIhwROBJKFdehjzRH1A3-fOgPjfGgRzlR0ZPJFsQRLFp5lQTgFE+2zFDLCrD3TlWK4oSAlUrSDLMu9DNob4MlBkKvmhopBGSuEBT8t8CT8oERQw429EmclxM9rLZO2Q6zpuh6Ll025fpfYGckG-5VHG58byfIULwzYNCS2wlhOMVL94yyQcv1Y9jVVkVNZyAo+MZgnplJ0+Lvy+Tz1wdTuztR9jM69OgRROwYXC4NTyxNFBFruw4M-MqcZLqFORxxdEuJ6Bzup2TGfowd2PfqdYsF2PRcT8Wpfp2jFdU611c+x1ftMw3Tct-4bcdzkYQEbGTzsMkCRLpF-gxPEsei-nl4r47xeT2nqN7a+OeX5jo-jOvFUeDFV7VRTn-HaW8YLNXgjTfetdtYYUbs3CIrcgjtxGpfAiB4cjsB+DFeMTwDzzhiiPcWkDv5rxgdPeBPRMYfmAbjMBy0aEO3WsnDe-8noIJekg3YCQUFa08npE+WCz44IvlfDc7cBQzVjDFQopFyFv2BOdLhlVEZgR4k6fMwgnR4gAGoCQAPKegADLugsZQJ0JInSegJE6TWnU0G60Dn5MURsNxJFjM3eMnxDxxC+NGahy9aE8P0TlQxFphD0iseSe0ABNMkVi8S2OQPYxxzjCSOPtHick1iiTIHcYfeuXk9byV8QFZSOQ4jENjKRaMRQFyKkiZ-aJejLQGKMUkikaSMk2LsQ4pxLjCnFNKeU2m44PGeQDj5HxYYQ6BSwREdSjcwhURnFgzRZ5tFRO4b0lE-SEl8WVmSVWwl1ZiTEQs-23l9YrL8cpXcPMghRASGfcGR5L5dPtrop2Zy4lGLsh7JynoKlSSPtU7xht6mPEvjzcinxPi9RyHyGIgKKpXRBbQOgeIoBsVYiCAARqwNMvElbEmuUJESGsa7iKeTUoOdS1kyheSFXcvUNSWx+fpd+RzuknIJUSklDAyWYEpWAalbt7KOS9jCz6cKlkvMRZyxAPy4zNwBAtT4fIVxxlxfDce1VCW0GJaSqAFKqXdhnpWQqxUNilQ-kC-FP92CWutVK21Mr7WPnLoIyuu9RwPMqacJIRQ77yjIXKS23yCJClIjy5U-gJSRVCieLR4CdGerXj6yV0rUCyupY6wBLDDoLzxiKj1ktC0SptXauVDqmGU1eghPe8zI3auSJshaQQkykUTfcLlql8jRGVLEJIUZfKmsLnQi1Ta-UtvLUwjGWM2GgKXqK4FXqi3NoDa2oNFampCKrg4OZ9NHlH2jQOuNw6VwaOTQUJuvUUjCwzd8aRC6v4gS4OgW6RwaX8XpWrUSKq648nIuNcGRD+RJHeN8Fco0-09LhIB4DqFbTuwcp7ZyUHPGylg4FCGIUUhxn+eDQ16GxW5iw5ZEDiswPknpMSRkdIKQWPpG45lt6qmkeUkLcI8QYipCHokOj+7JBAaYzhljVz6R4mpE6bEeJKAOSI55ITjwNQ8z0o0gWj95xRGkwWxj7FmOXLpbgTEWTyQUi0-x3tJGx2PF6n1L58RYgLXeCNczDbLPwVA1cgkqTsTOYjbCqpPyiHxh1WbH5SolJ6ZCOwa2fwjwlAlI3Mzwq83HJk8F6ztLSR2aJDSVJ2nupUVvtGGKYoggUR+VEcaQoeYrnlJbUo5FDyBfHiVnDZ6s4utrHnOteKgv0Gw3QYN57Q1vRczF043zZw3z3KFKIjSUjjXbsRDSAtLhFEtgN1eQ25sjaATjHd7qpuDZm-Jy77bEGXpq0fNbIUqKbZQ7cOD3ziF5CXIorrGkzt0Iu7QZERBqB3UU3Sz0AAhUpJJKA0kc5V8k3se0rcQIkVF22Z2Jv5BKODI1m47JinNPSYoc2HMK3uizj2rPDZh3DgkFjGSMhR2xjTFJzFQrxE6Ikrj3v113LfVIl8H7FGeO52UUQlR31InkDSI1n7kPBwB5nIX2Bs8ysIDnXOUf2kxNY7JzlhcEhJMp1TYvTgqlviubbMuRr-ByONcUrxvm+V3JEIoMUTynkJZxeAbJd31rYDj1V9cAC0bWNzx-Bx0ZY+ghDR+g4ga219iKQyjGFWnwZk-cFT10eC9pS4Z+I1qhAlHNmNIXORfw5F3jty122KvU4wgJ5lNzZucuf3ymjAUdvTtO9fRFJs5ZmrUsIHIqEQIHdtJD+eNEUfXrwLonH2qy2CLg6z6XJNVfkVfJ-G+UK3NnCisFuqpvosTDt9VOM8QzUjcuvE-kcpNIQZMVxBfpqb4dfNeO-TsfXSAR-KNB+W+KnQ8YWTLFUcaZMfqX3PyRfCiEUIA2-UmMuCAgMXfafffcaHBO+Uoa2RvXkOnCPe7KBG6WqRhABKAXA2UZ-XqSRd-chfkLmGKQUVINbXkQaYeArK-RnBtLAugsuPXWHTKJguLPqA8FSEabvYWbbLmEoO+SISfIoRUduJ4TA2graCQ-AWgVAfAdAMsUYAQcAm9VzWQ5pBQlSChFQwKGIV4M+a4EaH4fwP3PQ3hKeHA6w3HWUa2W+AgjlWfTFN4EoWnZ4RpSGHwkuPwzeBgpg54cnVgt-bSD-AhLBcIKMEoAWCOMKA5Kgs1Gg3w2BaHKQqw32QI5LIMFUZ4IISIbNY2duTBFSFRFSHZJUeI3+aeQldAckMYAYMAMYMAGbCAGQvyN4BoqOZolSa+HZQHGnRIKMLFHZXo9eRIh6Iwkwswiw-gaog+Wo6Yo8UKOYrBBYjcA8JuBaSIEiVIooLUIQ2Ga-UQjac5JEFI4IvfMIvbb4fqOAnSRIZvNIEWS-V4kQ81D4sFZOZIgImPKNEaPqLFRUS4TUSGcaG4dQuLM+Q-LwwQiEu2agpdGE2AeJUAqoyYhEzPWvZEnuPkfkFmZUUiZNNIHmB+NcONFXTYsQWEzsXY0w8whgSw6kmoxEvtJcBktE5kzEsjXyYhUaSGc-PlTYw9VdY9alb4-AjVQg-xH5TZS2WArFYI1SNUldEtMtNteE8U2k1I0IdIl3Z9RXT-bVJokKL4QPflEoZ4ok+Of9U5dUy0wNCCSQu6GQ1SIhAPcJCOBrV9JY+cPkZvF079c0q1Ytf1UtEM9EdgQU-YkUw4sU44iU2vSMwEqiOdd4OM-xDUIhPIRDVSDuOIC-enYQyPc7HXEDFIuIIgwofqFIc2FrPSDNIAyHebJgrw2cHLXyRuRMbvV02UCUV4OLPuZvFIa2cE1syE9siHTs1nKkpgrBJuIzQ8VpIII8rE8nHZLwiso1b6KoKoIAA */
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
    },
  });

export type DatasetQualityControllerStateService = InterpreterFrom<
  typeof createDatasetQualityControllerStateMachine
>;
