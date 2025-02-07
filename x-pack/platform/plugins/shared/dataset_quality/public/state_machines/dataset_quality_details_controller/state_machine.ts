/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core-notifications-browser';
import { getDateISORange } from '@kbn/timerange';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom, raise } from 'xstate';
import {
  Dashboard,
  DataStreamDetails,
  DataStreamSettings,
  DegradedFieldAnalysis,
  DegradedFieldResponse,
  DegradedFieldValues,
  FailedDocsDetails,
  FailedDocsErrorsResponse,
  NonAggregatableDatasets,
  UpdateFieldLimitResponse,
} from '../../../common/api_types';
import { indexNameToDataStreamParts } from '../../../common/utils';
import { IDataStreamDetailsClient } from '../../services/data_stream_details';
import { IDataStreamsStatsClient } from '../../services/data_streams_stats';
import { DatasetQualityStartDeps } from '../../types';
import { fetchNonAggregatableDatasetsFailedNotifier } from '../common/notifications';
import {
  DatasetQualityDetailsControllerContext,
  DatasetQualityDetailsControllerEvent,
  DatasetQualityDetailsControllerTypeState,
} from './types';

import { IntegrationType } from '../../../common/data_stream_details';
import {
  assertBreakdownFieldEcsFailedNotifier,
  fetchDataStreamDetailsFailedNotifier,
  fetchDataStreamIntegrationFailedNotifier,
  fetchDataStreamSettingsFailedNotifier,
  fetchIntegrationDashboardsFailedNotifier,
  rolloverDataStreamFailedNotifier,
  updateFieldLimitFailedNotifier,
} from './notifications';
import {
  filterIssues,
  mapDegradedFieldsIssues,
  mapFailedDocsIssues,
} from '../../utils/quality_issues';

export const createPureDatasetQualityDetailsControllerStateMachine = (
  initialContext: DatasetQualityDetailsControllerContext
) =>
  createMachine<
    DatasetQualityDetailsControllerContext,
    DatasetQualityDetailsControllerEvent,
    DatasetQualityDetailsControllerTypeState
  >(
    {
      id: 'DatasetQualityDetailsController',
      context: initialContext,
      predictableActionArguments: true,
      initial: 'initializing',
      states: {
        initializing: {
          type: 'parallel',
          states: {
            nonAggregatableDataset: {
              initial: 'fetching',
              states: {
                fetching: {
                  invoke: {
                    src: 'checkDatasetIsAggregatable',
                    onDone: {
                      target: 'done',
                      actions: ['storeDatasetAggregatableStatus'],
                    },
                    onError: [
                      {
                        target: '#DatasetQualityDetailsController.indexNotFound',
                        cond: 'isIndexNotFoundError',
                      },
                      {
                        target: 'done',
                        actions: ['notifyFailedFetchForAggregatableDatasets'],
                      },
                    ],
                  },
                },
                done: {
                  on: {
                    UPDATE_TIME_RANGE: {
                      target: 'fetching',
                      actions: ['storeTimeRange'],
                    },
                  },
                },
              },
            },
            dataStreamDetails: {
              initial: 'fetching',
              states: {
                fetching: {
                  invoke: {
                    src: 'loadDataStreamDetails',
                    onDone: {
                      target: 'done',
                      actions: ['storeDataStreamDetails'],
                    },
                    onError: [
                      {
                        target: '#DatasetQualityDetailsController.indexNotFound',
                        cond: 'isIndexNotFoundError',
                      },
                      {
                        target: 'done',
                        actions: ['notifyFetchDataStreamDetailsFailed'],
                      },
                    ],
                  },
                },
                done: {
                  on: {
                    UPDATE_TIME_RANGE: {
                      target: 'fetching',
                      actions: ['storeTimeRange'],
                    },
                    BREAKDOWN_FIELD_CHANGE: {
                      target:
                        '#DatasetQualityDetailsController.initializing.checkBreakdownFieldIsEcs.fetching',
                      actions: ['storeBreakDownField'],
                    },
                    QUALITY_ISSUES_CHART_CHANGE: {
                      target: 'done',
                      actions: ['storeQualityIssuesChart'],
                    },
                  },
                },
              },
            },
            checkBreakdownFieldIsEcs: {
              initial: 'fetching',
              states: {
                fetching: {
                  invoke: {
                    src: 'checkBreakdownFieldIsEcs',
                    onDone: {
                      target: 'done',
                      actions: ['storeBreakdownFieldEcsStatus'],
                    },
                    onError: {
                      target: 'done',
                      actions: ['notifyCheckBreakdownFieldIsEcsFailed'],
                    },
                  },
                },
                done: {},
              },
            },
            dataStreamSettings: {
              initial: 'fetchingDataStreamSettings',
              states: {
                fetchingDataStreamSettings: {
                  invoke: {
                    src: 'loadDataStreamSettings',
                    onDone: {
                      target: 'qualityIssues',
                      actions: ['storeDataStreamSettings'],
                    },
                    onError: [
                      {
                        target: '#DatasetQualityDetailsController.indexNotFound',
                        cond: 'isIndexNotFoundError',
                      },
                      {
                        target: 'errorFetchingDataStreamSettings',
                        actions: ['notifyFetchDataStreamSettingsFailed'],
                      },
                    ],
                  },
                },
                errorFetchingDataStreamSettings: {},
                qualityIssues: {
                  type: 'parallel',
                  states: {
                    dataStreamDegradedFields: {
                      initial: 'fetchingDataStreamDegradedFields',
                      states: {
                        fetchingDataStreamDegradedFields: {
                          invoke: {
                            src: 'loadDegradedFields',
                            onDone: {
                              target: 'doneFetchingDegradedFields',
                              actions: ['storeDegradedFields'],
                            },
                            onError: [
                              {
                                target: '#DatasetQualityDetailsController.indexNotFound',
                                cond: 'isIndexNotFoundError',
                              },
                              {
                                target: 'errorFetchingDegradedFields',
                              },
                            ],
                          },
                        },
                        errorFetchingDegradedFields: {},
                        doneFetchingDegradedFields: {
                          type: 'final',
                        },
                      },
                    },
                    dataStreamFailedDocs: {
                      initial: 'fetchingFailedDocs',
                      states: {
                        fetchingFailedDocs: {
                          invoke: {
                            src: 'loadFailedDocsDetails',
                            onDone: {
                              target: 'doneFetchingFailedDocs',
                              actions: ['storeFailedDocsDetails'],
                            },
                            onError: [
                              {
                                target: 'notImplemented',
                                cond: 'checkIfNotImplemented',
                              },
                              {
                                target: '#DatasetQualityDetailsController.indexNotFound',
                                cond: 'isIndexNotFoundError',
                              },
                              {
                                target: 'errorFetchingFailedDocs',
                              },
                            ],
                          },
                        },
                        notImplemented: {
                          type: 'final',
                        },
                        errorFetchingFailedDocs: {},
                        doneFetchingFailedDocs: {
                          type: 'final',
                        },
                      },
                    },
                  },
                  onDone: {
                    target:
                      '#DatasetQualityDetailsController.initializing.dataStreamSettings.doneFetchingQualityIssues',
                  },
                },
                doneFetchingQualityIssues: {
                  entry: ['raiseDegradedFieldsLoaded'],
                  on: {
                    UPDATE_QUALITY_ISSUES_TABLE_CRITERIA: {
                      target: 'doneFetchingQualityIssues',
                      actions: ['storeQualityIssuesTableOptions'],
                    },
                    OPEN_QUALITY_ISSUE_FLYOUT: {
                      target:
                        '#DatasetQualityDetailsController.initializing.qualityIssueFlyout.open',
                      actions: ['storeExpandedQualityIssue', 'resetFieldLimitServerResponse'],
                    },
                    TOGGLE_CURRENT_QUALITY_ISSUES: {
                      target:
                        '#DatasetQualityDetailsController.initializing.dataStreamSettings.qualityIssues.dataStreamDegradedFields.fetchingDataStreamDegradedFields',
                      actions: ['toggleCurrentQualityIssues'],
                    },
                  },
                },
              },
              on: {
                UPDATE_TIME_RANGE: {
                  target: '.fetchingDataStreamSettings',
                },
              },
            },
            checkAndLoadIntegrationAndDashboards: {
              initial: 'checkingAndLoadingIntegration',
              states: {
                checkingAndLoadingIntegration: {
                  invoke: {
                    src: 'checkAndLoadIntegration',
                    onDone: [
                      {
                        target: 'loadingIntegrationDashboards',
                        actions: 'storeDataStreamIntegration',
                        cond: 'isDataStreamIsPartOfIntegration',
                      },
                      {
                        actions: 'storeDataStreamIntegration',
                        target: 'done',
                      },
                    ],
                    onError: {
                      target: 'done',
                      actions: ['notifyFetchDatasetIntegrationsFailed'],
                    },
                  },
                },
                loadingIntegrationDashboards: {
                  invoke: {
                    src: 'loadIntegrationDashboards',
                    onDone: {
                      target: 'done',
                      actions: ['storeIntegrationDashboards'],
                    },
                    onError: [
                      {
                        target: 'unauthorizedToLoadDashboards',
                        cond: 'checkIfActionForbidden',
                      },
                      {
                        target: 'done',
                        actions: ['notifyFetchIntegrationDashboardsFailed'],
                      },
                    ],
                  },
                },
                unauthorizedToLoadDashboards: {
                  type: 'final',
                },
                done: {},
              },
            },
            qualityIssueFlyout: {
              initial: 'pending',
              states: {
                pending: {
                  always: [
                    {
                      target: 'closed',
                      cond: 'hasNoQualityIssueSelected',
                    },
                  ],
                },
                open: {
                  initial: 'initializing',
                  states: {
                    initializing: {
                      always: [
                        {
                          target: 'degradedFieldFlyout',
                          cond: 'isDegradedFieldFlyout',
                        },
                        {
                          target: 'failedDocsFlyout',
                        },
                      ],
                    },
                    failedDocsFlyout: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          invoke: {
                            src: 'loadfailedDocsErrors',
                            onDone: {
                              target: 'done',
                              actions: ['storeFailedDocsErrors'],
                            },
                            onError: [
                              {
                                target: 'unsupported',
                                cond: 'checkIfNotImplemented',
                              },
                              {
                                target: '#DatasetQualityDetailsController.indexNotFound',
                                cond: 'isIndexNotFoundError',
                              },
                              {
                                target: 'done',
                              },
                            ],
                          },
                        },
                        done: {
                          on: {
                            UPDATE_FAILED_DOCS_ERRORS_TABLE_CRITERIA: {
                              target: 'done',
                              actions: ['storeFailedDocsErrorsTableOptions'],
                            },
                          },
                        },
                        unsupported: {},
                      },
                    },
                    degradedFieldFlyout: {
                      type: 'parallel',
                      states: {
                        ignoredValues: {
                          initial: 'fetching',
                          states: {
                            fetching: {
                              invoke: {
                                src: 'loadDegradedFieldValues',
                                onDone: {
                                  target: 'done',
                                  actions: ['storeDegradedFieldValues'],
                                },
                                onError: [
                                  {
                                    target: '#DatasetQualityDetailsController.indexNotFound',
                                    cond: 'isIndexNotFoundError',
                                  },
                                  {
                                    target: 'done',
                                  },
                                ],
                              },
                            },
                            done: {},
                          },
                        },
                        mitigation: {
                          initial: 'analyzing',
                          states: {
                            analyzing: {
                              invoke: {
                                src: 'analyzeDegradedField',
                                onDone: {
                                  target: 'analyzed',
                                  actions: ['storeDegradedFieldAnalysis'],
                                },
                                onError: {
                                  target: 'analyzed',
                                },
                              },
                            },
                            analyzed: {
                              on: {
                                SET_NEW_FIELD_LIMIT: {
                                  target: 'mitigating',
                                  actions: 'storeNewFieldLimit',
                                },
                              },
                            },
                            mitigating: {
                              invoke: {
                                src: 'saveNewFieldLimit',
                                onDone: [
                                  {
                                    target: 'askingForRollover',
                                    actions: 'storeNewFieldLimitResponse',
                                    cond: 'hasFailedToUpdateLastBackingIndex',
                                  },
                                  {
                                    target: 'success',
                                    actions: 'storeNewFieldLimitResponse',
                                  },
                                ],
                                onError: {
                                  target: 'error',
                                  actions: [
                                    'storeNewFieldLimitErrorResponse',
                                    'notifySaveNewFieldLimitError',
                                  ],
                                },
                              },
                            },
                            askingForRollover: {
                              on: {
                                ROLLOVER_DATA_STREAM: {
                                  target: 'rollingOver',
                                },
                              },
                            },
                            rollingOver: {
                              invoke: {
                                src: 'rolloverDataStream',
                                onDone: {
                                  target: 'success',
                                  actions: ['raiseForceTimeRangeRefresh'],
                                },
                                onError: {
                                  target: 'error',
                                  actions: 'notifySaveNewFieldLimitError',
                                },
                              },
                            },
                            success: {},
                            error: {},
                          },
                        },
                      },
                    },
                  },
                  on: {
                    CLOSE_DEGRADED_FIELD_FLYOUT: {
                      target: 'closed',
                      actions: ['storeExpandedQualityIssue'],
                    },
                    UPDATE_TIME_RANGE: {
                      target:
                        '#DatasetQualityDetailsController.initializing.qualityIssueFlyout.open',
                    },
                  },
                },
                closed: {
                  on: {
                    OPEN_QUALITY_ISSUE_FLYOUT: {
                      target:
                        '#DatasetQualityDetailsController.initializing.qualityIssueFlyout.open',
                      actions: ['storeExpandedQualityIssue'],
                    },
                  },
                },
              },
              on: {
                DEGRADED_FIELDS_LOADED: [
                  {
                    target: '.open',
                    cond: 'shouldOpenFlyout',
                  },
                  {
                    target: '.closed',
                    actions: ['storeExpandedQualityIssue'],
                  },
                ],
              },
            },
          },
        },
        indexNotFound: {
          entry: 'handleIndexNotFoundError',
        },
      },
    },
    {
      actions: {
        storeDatasetAggregatableStatus: assign(
          (_context, event: DoneInvokeEvent<NonAggregatableDatasets>) => {
            return 'data' in event
              ? {
                  isNonAggregatable: !event.data.aggregatable,
                }
              : {};
          }
        ),
        storeTimeRange: assign((context, event) => {
          return {
            timeRange: 'timeRange' in event ? event.timeRange : context.timeRange,
          };
        }),
        storeDataStreamDetails: assign((_context, event: DoneInvokeEvent<DataStreamDetails>) => {
          return 'data' in event
            ? {
                dataStreamDetails: event.data,
              }
            : {};
        }),
        storeQualityIssuesChart: assign((_context, event) => {
          return 'qualityIssuesChart' in event
            ? { qualityIssuesChart: event.qualityIssuesChart }
            : {};
        }),
        storeBreakDownField: assign((_context, event) => {
          return 'breakdownField' in event ? { breakdownField: event.breakdownField } : {};
        }),
        storeBreakdownFieldEcsStatus: assign((_context, event: DoneInvokeEvent<boolean>) => {
          return 'data' in event
            ? {
                isBreakdownFieldEcs: event.data,
              }
            : {};
        }),
        storeFailedDocsDetails: assign((context, event: DoneInvokeEvent<FailedDocsDetails>) => {
          return 'data' in event
            ? {
                qualityIssues: {
                  ...context.qualityIssues,
                  data: [
                    ...filterIssues(context.qualityIssues.data, 'failed'),
                    ...mapFailedDocsIssues(event.data),
                  ],
                },
              }
            : {};
        }),
        storeFailedDocsErrors: assign(
          (context, event: DoneInvokeEvent<FailedDocsErrorsResponse>) => {
            return 'data' in event
              ? {
                  failedDocsErrors: {
                    ...context.failedDocsErrors,
                    data: event.data.errors,
                  },
                }
              : {};
          }
        ),
        storeDegradedFields: assign((context, event: DoneInvokeEvent<DegradedFieldResponse>) => {
          return 'data' in event
            ? {
                qualityIssues: {
                  ...context.qualityIssues,
                  data: [
                    ...filterIssues(context.qualityIssues.data, 'degraded'),
                    ...mapDegradedFieldsIssues(event.data?.degradedFields),
                  ],
                },
              }
            : {};
        }),
        storeDegradedFieldValues: assign((_, event: DoneInvokeEvent<DegradedFieldValues>) => {
          return 'data' in event
            ? {
                degradedFieldValues: event.data,
              }
            : {};
        }),
        storeDegradedFieldAnalysis: assign((_, event: DoneInvokeEvent<DegradedFieldAnalysis>) => {
          return 'data' in event
            ? {
                degradedFieldAnalysis: event.data,
              }
            : {};
        }),
        storeQualityIssuesTableOptions: assign((context, event) => {
          return 'quality_issues_criteria' in event
            ? {
                qualityIssues: {
                  ...context.qualityIssues,
                  table: event.quality_issues_criteria,
                },
              }
            : {};
        }),
        storeFailedDocsErrorsTableOptions: assign((context, event) => {
          return 'failed_docs_errors_criteria' in event
            ? {
                failedDocsErrors: {
                  ...context.failedDocsErrors,
                  table: event.failed_docs_errors_criteria,
                },
              }
            : {};
        }),
        storeExpandedQualityIssue: assign((_, event) => {
          return {
            expandedQualityIssue:
              'qualityIssue' in event
                ? { name: event.qualityIssue.name, type: event.qualityIssue.type }
                : undefined,
          };
        }),
        toggleCurrentQualityIssues: assign((context) => {
          return {
            showCurrentQualityIssues: !context.showCurrentQualityIssues,
          };
        }),
        raiseDegradedFieldsLoaded: raise('DEGRADED_FIELDS_LOADED'),
        storeDataStreamSettings: assign((_context, event: DoneInvokeEvent<DataStreamSettings>) => {
          return 'data' in event
            ? {
                dataStreamSettings: event.data,
              }
            : {};
        }),
        storeDataStreamIntegration: assign((context, event: DoneInvokeEvent<IntegrationType>) => {
          return 'data' in event
            ? {
                integration: event.data,
              }
            : {};
        }),
        storeIntegrationDashboards: assign((context, event: DoneInvokeEvent<Dashboard[]>) => {
          return 'data' in event
            ? {
                integrationDashboards: event.data,
              }
            : {};
        }),
        handleIndexNotFoundError: assign(() => {
          return {
            isIndexNotFoundError: true,
          };
        }),
        storeNewFieldLimit: assign((_, event) => {
          return 'newFieldLimit' in event
            ? { fieldLimit: { newFieldLimit: event.newFieldLimit } }
            : {};
        }),
        storeNewFieldLimitResponse: assign(
          (context, event: DoneInvokeEvent<UpdateFieldLimitResponse>) => {
            return 'data' in event
              ? { fieldLimit: { ...context.fieldLimit, result: event.data, error: false } }
              : {};
          }
        ),
        storeNewFieldLimitErrorResponse: assign((context) => {
          return { fieldLimit: { ...context.fieldLimit, error: true } };
        }),
        resetFieldLimitServerResponse: assign(() => ({
          fieldLimit: undefined,
        })),
        raiseForceTimeRangeRefresh: raise('UPDATE_TIME_RANGE'),
      },
      guards: {
        checkIfActionForbidden: (_, event) => {
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
        isIndexNotFoundError: (_, event) => {
          return (
            ('data' in event &&
              typeof event.data === 'object' &&
              'statusCode' in event.data &&
              event.data.statusCode === 500 &&
              'originalMessage' in event.data &&
              (event.data.originalMessage as string)?.includes('index_not_found_exception')) ??
            false
          );
        },
        shouldOpenFlyout: (context, _event, meta) => {
          return (
            Boolean(context.expandedQualityIssue) &&
            Boolean(
              context.qualityIssues.data?.some(
                (field) => field.name === context.expandedQualityIssue?.name
              )
            )
          );
        },
        isDegradedFieldFlyout: (context) => {
          return Boolean(
            context.expandedQualityIssue && context.expandedQualityIssue.type === 'degraded'
          );
        },
        hasNoQualityIssueSelected: (context) => {
          return !Boolean(context.expandedQualityIssue);
        },
        hasFailedToUpdateLastBackingIndex: (_, event) => {
          return (
            'data' in event &&
            typeof event.data === 'object' &&
            'isLatestBackingIndexUpdated' in event.data &&
            !event.data.isLatestBackingIndexUpdated
          );
        },
        isDataStreamIsPartOfIntegration: (_, event) => {
          return (
            'data' in event &&
            typeof event.data === 'object' &&
            'isIntegration' in event.data &&
            event.data.isIntegration
          );
        },
      },
    }
  );

export interface DatasetQualityDetailsControllerStateMachineDependencies {
  initialContext: DatasetQualityDetailsControllerContext;
  plugins: DatasetQualityStartDeps;
  toasts: IToasts;
  dataStreamStatsClient: IDataStreamsStatsClient;
  dataStreamDetailsClient: IDataStreamDetailsClient;
  isFailureStoreEnabled: boolean;
}

export const createDatasetQualityDetailsControllerStateMachine = ({
  initialContext,
  plugins,
  toasts,
  dataStreamStatsClient,
  dataStreamDetailsClient,
  isFailureStoreEnabled,
}: DatasetQualityDetailsControllerStateMachineDependencies) =>
  createPureDatasetQualityDetailsControllerStateMachine(initialContext).withConfig({
    actions: {
      notifyFailedFetchForAggregatableDatasets: (_context, event: DoneInvokeEvent<Error>) =>
        fetchNonAggregatableDatasetsFailedNotifier(toasts, event.data),
      notifyFetchDataStreamDetailsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDataStreamDetailsFailedNotifier(toasts, event.data),
      notifyCheckBreakdownFieldIsEcsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        assertBreakdownFieldEcsFailedNotifier(toasts, event.data),
      notifyFetchDataStreamSettingsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDataStreamSettingsFailedNotifier(toasts, event.data),
      notifyFetchIntegrationDashboardsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchIntegrationDashboardsFailedNotifier(toasts, event.data),
      notifyFetchDatasetIntegrationsFailed: (context, event: DoneInvokeEvent<Error>) => {
        return fetchDataStreamIntegrationFailedNotifier(toasts, event.data);
      },
      notifySaveNewFieldLimitError: (_context, event: DoneInvokeEvent<Error>) =>
        updateFieldLimitFailedNotifier(toasts, event.data),
      notifyRolloverDataStreamError: (context, event: DoneInvokeEvent<Error>) =>
        rolloverDataStreamFailedNotifier(toasts, event.data, context.dataStream),
    },
    services: {
      checkDatasetIsAggregatable: (context) => {
        const { type } = indexNameToDataStreamParts(context.dataStream);
        const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

        return dataStreamStatsClient.getNonAggregatableDatasets({
          types: [type],
          start,
          end,
          dataStream: context.dataStream,
        });
      },
      loadDataStreamDetails: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

        return dataStreamDetailsClient.getDataStreamDetails({
          dataStream: context.dataStream,
          start,
          end,
        });
      },
      checkBreakdownFieldIsEcs: async (context) => {
        if (context.breakdownField) {
          const allowedFieldSources = ['ecs', 'metadata'];

          // This timeout is to avoid a runtime error that randomly happens on breakdown field change
          // TypeError: Cannot read properties of undefined (reading 'timeFieldName')
          await new Promise((res) => setTimeout(res, 300));

          const client = await plugins.fieldsMetadata.getClient();
          const { fields } = await client.find({
            attributes: ['source'],
            fieldNames: [context.breakdownField],
          });

          const breakdownFieldSource = fields[context.breakdownField]?.source;

          return !!(breakdownFieldSource && allowedFieldSources.includes(breakdownFieldSource));
        }

        return false;
      },
      loadFailedDocsDetails: (context) => {
        if (!isFailureStoreEnabled) {
          const unsupportedError = {
            message: 'Failure store is disabled',
            statusCode: 501,
          };
          return Promise.reject(unsupportedError);
        }

        const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

        return dataStreamDetailsClient.getFailedDocsDetails({
          dataStream: context.dataStream,
          start,
          end,
        });
      },
      loadDegradedFields: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

        if (!context?.isNonAggregatable) {
          return dataStreamDetailsClient.getDataStreamDegradedFields({
            dataStream:
              context.showCurrentQualityIssues &&
              'dataStreamSettings' in context &&
              context.dataStreamSettings &&
              context.dataStreamSettings.lastBackingIndexName
                ? context.dataStreamSettings.lastBackingIndexName
                : context.dataStream,
            start,
            end,
          });
        }

        return Promise.resolve();
      },

      loadDegradedFieldValues: (context) => {
        if ('expandedQualityIssue' in context && context.expandedQualityIssue) {
          return dataStreamDetailsClient.getDataStreamDegradedFieldValues({
            dataStream: context.dataStream,
            degradedField: context.expandedQualityIssue.name,
          });
        }
        return Promise.resolve();
      },
      analyzeDegradedField: (context) => {
        if (context?.qualityIssues?.data?.length) {
          const selectedDegradedField = context.qualityIssues.data.find(
            (field) => field.name === context.expandedQualityIssue?.name
          );

          if (selectedDegradedField && selectedDegradedField.type === 'degraded') {
            return dataStreamDetailsClient.analyzeDegradedField({
              dataStream: context.dataStream,
              degradedField: context.expandedQualityIssue?.name!,
              lastBackingIndex: selectedDegradedField.indexFieldWasLastPresentIn!,
            });
          }
        }
        return Promise.resolve();
      },
      loadfailedDocsErrors: (context) => {
        if (!isFailureStoreEnabled) {
          const unsupportedError = {
            message: 'Failure store is disabled',
            statusCode: 501,
          };
          return Promise.reject(unsupportedError);
        }

        if ('expandedQualityIssue' in context && context.expandedQualityIssue) {
          const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

          return dataStreamDetailsClient.getFailedDocsErrors({
            dataStream: context.dataStream,
            start,
            end,
          });
        }
        return Promise.resolve();
      },
      loadDataStreamSettings: (context) => {
        return dataStreamDetailsClient.getDataStreamSettings({
          dataStream: context.dataStream,
        });
      },
      checkAndLoadIntegration: (context) => {
        return dataStreamDetailsClient.checkAndLoadIntegration({
          dataStream: context.dataStream,
        });
      },
      loadIntegrationDashboards: (context) => {
        if ('integration' in context && context.integration && context.integration.integration) {
          return dataStreamDetailsClient.getIntegrationDashboards({
            integration: context.integration.integration.name,
          });
        }

        return Promise.resolve();
      },
      saveNewFieldLimit: (context) => {
        if ('fieldLimit' in context && context.fieldLimit && context.fieldLimit.newFieldLimit) {
          return dataStreamDetailsClient.setNewFieldLimit({
            dataStream: context.dataStream,
            newFieldLimit: context.fieldLimit.newFieldLimit,
          });
        }

        return Promise.resolve();
      },
      rolloverDataStream: (context) => {
        return dataStreamDetailsClient.rolloverDataStream({
          dataStream: context.dataStream,
        });
      },
    },
  });

export type DatasetQualityDetailsControllerStateService = InterpreterFrom<
  typeof createDatasetQualityDetailsControllerStateMachine
>;
