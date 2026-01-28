/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core-notifications-browser';
import { getDateISORange } from '@kbn/timerange';
import type { ActorRefFrom } from 'xstate';
import { assign, createMachine, fromPromise, raise } from 'xstate';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { omit } from 'lodash';
import type {
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
import type { IDataStreamDetailsClient } from '../../services/data_stream_details';
import type { DatasetQualityStartDeps } from '../../types';
import { fetchNonAggregatableDatasetsFailedNotifier } from '../common/notifications';
import type {
  DatasetQualityDetailsControllerContext,
  DatasetQualityDetailsControllerEvent,
} from './types';

import type { IntegrationType } from '../../../common/data_stream_details';
import {
  assertBreakdownFieldEcsFailedNotifier,
  fetchDataStreamDetailsFailedNotifier,
  fetchDataStreamIntegrationFailedNotifier,
  fetchDataStreamSettingsFailedNotifier,
  fetchIntegrationDashboardsFailedNotifier,
  rolloverDataStreamFailedNotifier,
  updateFieldLimitFailedNotifier,
  updateFailureStoreFailedNotifier,
  updateFailureStoreSuccessNotifier,
} from './notifications';
import {
  filterIssues,
  mapDegradedFieldsIssues,
  mapFailedDocsIssues,
} from '../../utils/quality_issues';

export const createPureDatasetQualityDetailsControllerStateMachine = (
  initialContext: DatasetQualityDetailsControllerContext
) =>
  createMachine(
    {
      types: {} as {
        context: DatasetQualityDetailsControllerContext;
        events: DatasetQualityDetailsControllerEvent;
      },
      id: 'DatasetQualityDetailsController',
      context: initialContext,
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
                    input: ({ context }) => context,
                    onDone: {
                      target: 'done',
                      actions: ['storeDatasetAggregatableStatus'],
                    },
                    onError: [
                      {
                        target: '#DatasetQualityDetailsController.indexNotFound',
                        guard: 'isIndexNotFoundError',
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
                    input: ({ context }) => context,
                    onDone: {
                      target: 'done',
                      actions: ['storeDataStreamDetails'],
                    },
                    onError: [
                      {
                        target: '#DatasetQualityDetailsController.indexNotFound',
                        guard: 'isIndexNotFoundError',
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
                    input: ({ context }) => context,
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
                    input: ({ context }) => context,
                    onDone: {
                      target: 'qualityIssues',
                      actions: ['storeDataStreamSettings'],
                    },
                    onError: [
                      {
                        target: '#DatasetQualityDetailsController.indexNotFound',
                        guard: 'isIndexNotFoundError',
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
                            input: ({ context }) => context,
                            onDone: {
                              target: 'doneFetchingDegradedFields',
                              actions: ['storeDegradedFields'],
                            },
                            onError: [
                              {
                                target: '#DatasetQualityDetailsController.indexNotFound',
                                guard: 'isIndexNotFoundError',
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
                      initial: 'pending',
                      states: {
                        pending: {
                          always: [
                            {
                              target: 'fetchingFailedDocs',
                              guard: 'canReadFailureStore',
                            },
                            {
                              // If the user does not have permission to read the failure store, we don't need to fetch failed docs
                              target: 'doneFetchingFailedDocs',
                            },
                          ],
                        },
                        fetchingFailedDocs: {
                          invoke: {
                            src: 'loadFailedDocsDetails',
                            input: ({ context }) => context,
                            onDone: {
                              target: 'doneFetchingFailedDocs',
                              actions: ['storeFailedDocsDetails'],
                            },
                            onError: [
                              {
                                target: 'notImplemented',
                                guard: 'checkIfNotImplemented',
                              },
                              {
                                target: '#DatasetQualityDetailsController.indexNotFound',
                                guard: 'isIndexNotFoundError',
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
                    UPDATE_SELECTED_ISSUE_TYPES: {
                      target: 'doneFetchingQualityIssues',
                      actions: ['updateSelectedIssueTypes'],
                    },
                    UPDATE_SELECTED_FIELDS: {
                      target: 'doneFetchingQualityIssues',
                      actions: ['updateSelectedFields'],
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
                    input: ({ context }) => context,
                    onDone: [
                      {
                        target: 'loadingIntegrationDashboards',
                        actions: 'storeDataStreamIntegration',
                        guard: 'isDataStreamIsPartOfIntegration',
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
                    input: ({ context }) => context,
                    onDone: {
                      target: 'done',
                      actions: ['storeIntegrationDashboards'],
                    },
                    onError: [
                      {
                        target: 'unauthorizedToLoadDashboards',
                        guard: 'checkIfActionForbidden',
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
                      guard: 'hasNoQualityIssueSelected',
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
                          guard: 'isDegradedFieldFlyout',
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
                            input: ({ context }) => context,
                            onDone: {
                              target: 'done',
                              actions: ['storeFailedDocsErrors'],
                            },
                            onError: [
                              {
                                target: 'unsupported',
                                guard: 'checkIfNotImplemented',
                              },
                              {
                                target: '#DatasetQualityDetailsController.indexNotFound',
                                guard: 'isIndexNotFoundError',
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
                                input: ({ context }) => context,
                                onDone: {
                                  target: 'done',
                                  actions: ['storeDegradedFieldValues'],
                                },
                                onError: [
                                  {
                                    target: '#DatasetQualityDetailsController.indexNotFound',
                                    guard: 'isIndexNotFoundError',
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
                                input: ({ context }) => context,
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
                                input: ({ context }) => context,
                                onDone: [
                                  {
                                    target: 'askingForRollover',
                                    actions: 'storeNewFieldLimitResponse',
                                    guard: 'hasFailedToUpdateLastBackingIndex',
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
                                input: ({ context }) => context,
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
                    guard: 'shouldOpenFlyout',
                  },
                  {
                    target: '.closed',
                    actions: ['storeExpandedQualityIssue'],
                  },
                ],
              },
            },
            failureStoreUpdate: {
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    UPDATE_FAILURE_STORE: {
                      target: 'updating',
                      actions: ['storeDataStreamDetails'],
                    },
                  },
                },
                updating: {
                  invoke: {
                    src: 'updateFailureStore',
                    input: ({ context }) => context,
                    onDone: {
                      target: 'idle',
                      actions: ['notifyUpdateFailureStoreSuccess', 'raiseForceTimeRangeRefresh'],
                    },
                    onError: {
                      target: 'idle',
                      actions: ['notifyUpdateFailureStoreFailed', 'raiseForceTimeRangeRefresh'],
                    },
                  },
                },
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
        storeDatasetAggregatableStatus: assign(({ event }) => {
          if (!('output' in event)) return {};
          const output = event.output as NonAggregatableDatasets;
          return { isNonAggregatable: !output.aggregatable };
        }),
        storeTimeRange: assign(({ context, event }) => {
          return {
            timeRange: 'timeRange' in event ? event.timeRange : context.timeRange,
          };
        }),
        storeDataStreamDetails: assign(({ event }) => {
          // Handle XState v5 actor done events (output property)
          if ('output' in event) {
            return { dataStreamDetails: event.output as DataStreamDetails };
          }
          // Handle UPDATE_FAILURE_STORE event (dataStreamsDetails property)
          if ('dataStreamsDetails' in event) {
            return { dataStreamDetails: event.dataStreamsDetails as DataStreamDetails };
          }
          return {};
        }),
        storeQualityIssuesChart: assign(({ event }) => {
          return 'qualityIssuesChart' in event
            ? { qualityIssuesChart: event.qualityIssuesChart }
            : {};
        }),
        storeBreakDownField: assign(({ event }) => {
          return 'breakdownField' in event ? { breakdownField: event.breakdownField } : {};
        }),
        storeBreakdownFieldEcsStatus: assign(({ event }) => {
          if (!('output' in event)) return {};
          return { isBreakdownFieldEcs: event.output as boolean };
        }),
        storeFailedDocsDetails: assign(({ context, event }) => {
          if (!('output' in event)) return {};
          const output = event.output as FailedDocsDetails;
          return {
            qualityIssues: {
              ...context.qualityIssues,
              data: [
                ...filterIssues(context.qualityIssues.data, 'failed'),
                ...mapFailedDocsIssues(output),
              ],
            },
          };
        }),
        storeFailedDocsErrors: assign(({ context, event }) => {
          if (!('output' in event)) return {};
          const output = event.output as FailedDocsErrorsResponse;
          return {
            failedDocsErrors: {
              ...context.failedDocsErrors,
              data: output.errors,
            },
          };
        }),
        storeDegradedFields: assign(({ context, event }) => {
          if (!('output' in event)) return {};
          const output = event.output as DegradedFieldResponse;
          return {
            qualityIssues: {
              ...context.qualityIssues,
              data: [
                ...filterIssues(context.qualityIssues.data, 'degraded'),
                ...mapDegradedFieldsIssues(output?.degradedFields),
              ],
            },
          };
        }),
        storeDegradedFieldValues: assign(({ event }) => {
          if (!('output' in event)) return {};
          return { degradedFieldValues: event.output as DegradedFieldValues };
        }),
        storeDegradedFieldAnalysis: assign(({ event }) => {
          if (!('output' in event)) return {};
          return { degradedFieldAnalysis: event.output as DegradedFieldAnalysis };
        }),
        storeQualityIssuesTableOptions: assign(({ context, event }) => {
          return 'quality_issues_criteria' in event
            ? {
                qualityIssues: {
                  ...context.qualityIssues,
                  table: event.quality_issues_criteria,
                },
              }
            : {};
        }),
        storeFailedDocsErrorsTableOptions: assign(({ context, event }) => {
          return 'failed_docs_errors_criteria' in event
            ? {
                failedDocsErrors: {
                  ...context.failedDocsErrors,
                  table: event.failed_docs_errors_criteria,
                },
              }
            : {};
        }),
        storeExpandedQualityIssue: assign(({ event }) => {
          return {
            expandedQualityIssue:
              'qualityIssue' in event
                ? { name: event.qualityIssue.name, type: event.qualityIssue.type }
                : undefined,
          };
        }),
        toggleCurrentQualityIssues: assign(({ context }) => {
          return {
            showCurrentQualityIssues: !context.showCurrentQualityIssues,
          };
        }),
        updateSelectedIssueTypes: assign(({ event }) => {
          return {
            selectedIssueTypes: 'selectedIssueTypes' in event ? event.selectedIssueTypes : [],
          };
        }),
        updateSelectedFields: assign(({ event }) => {
          return {
            selectedFields: 'selectedFields' in event ? event.selectedFields : [],
          };
        }),
        raiseDegradedFieldsLoaded: raise({ type: 'DEGRADED_FIELDS_LOADED' }),
        storeDataStreamSettings: assign(({ event }) => {
          if (!('output' in event)) return {};
          return { dataStreamSettings: event.output as DataStreamSettings };
        }),
        storeDataStreamIntegration: assign(({ event }) => {
          if (!('output' in event)) return {};
          return { integration: event.output as IntegrationType };
        }),
        storeIntegrationDashboards: assign(({ event }) => {
          if (!('output' in event)) return {};
          return { integrationDashboards: event.output as Dashboard[] };
        }),
        handleIndexNotFoundError: assign(() => {
          return {
            isIndexNotFoundError: true,
          };
        }),
        storeNewFieldLimit: assign(({ event }) => {
          return 'newFieldLimit' in event
            ? { fieldLimit: { newFieldLimit: event.newFieldLimit } }
            : {};
        }),
        storeNewFieldLimitResponse: assign(({ context, event }) => {
          if (!('output' in event)) return {};
          const output = event.output as UpdateFieldLimitResponse;
          return { fieldLimit: { ...context.fieldLimit, result: output, error: false } };
        }),
        storeNewFieldLimitErrorResponse: assign(({ context }) => {
          return { fieldLimit: { ...context.fieldLimit, error: true } };
        }),
        resetFieldLimitServerResponse: assign(() => ({
          fieldLimit: undefined,
        })),
        raiseForceTimeRangeRefresh: raise(({ context }) => ({
          type: 'UPDATE_TIME_RANGE' as const,
          timeRange: context.timeRange,
        })),
      },
      guards: {
        checkIfActionForbidden: ({ event }) => {
          if (!('error' in event)) return false;
          const error = event.error as { statusCode?: number };
          return error?.statusCode === 403;
        },
        checkIfNotImplemented: ({ event }) => {
          if (!('error' in event)) return false;
          const error = event.error as { statusCode?: number };
          return error?.statusCode === 501;
        },
        isIndexNotFoundError: ({ event }) => {
          if (!('error' in event)) return false;
          const error = event.error as {
            statusCode?: number;
            originalMessage?: string;
          };
          return (
            error?.statusCode === 500 &&
            Boolean(error?.originalMessage?.includes('index_not_found_exception'))
          );
        },
        shouldOpenFlyout: ({ context }) => {
          return (
            Boolean(context.expandedQualityIssue) &&
            Boolean(
              context.qualityIssues.data?.some(
                (field) => field.name === context.expandedQualityIssue?.name
              )
            )
          );
        },
        isDegradedFieldFlyout: ({ context }) => {
          return Boolean(
            context.expandedQualityIssue && context.expandedQualityIssue.type === 'degraded'
          );
        },
        hasNoQualityIssueSelected: ({ context }) => {
          return !Boolean(context.expandedQualityIssue);
        },
        hasFailedToUpdateLastBackingIndex: ({ event }) => {
          if (!('output' in event)) return false;
          const output = event.output as { isLatestBackingIndexUpdated?: boolean };
          return output?.isLatestBackingIndexUpdated === false;
        },
        isDataStreamIsPartOfIntegration: ({ event }) => {
          if (!('output' in event)) return false;
          const output = event.output as { isIntegration?: boolean };
          return output?.isIntegration === true;
        },
        canReadFailureStore: ({ context }) => {
          return (
            'dataStreamSettings' in context &&
            Boolean(
              context.dataStreamSettings.datasetUserPrivileges?.datasetsPrivilages[
                context.dataStream
              ].canReadFailureStore
            )
          );
        },
      },
    }
  );

export interface DatasetQualityDetailsControllerStateMachineDependencies {
  initialContext: DatasetQualityDetailsControllerContext;
  plugins: DatasetQualityStartDeps;
  toasts: IToasts;
  dataStreamDetailsClient: IDataStreamDetailsClient;
  streamsRepositoryClient?: StreamsRepositoryClient; // Optional streams client for classic/wired views
  refreshDefinition?: () => void; // Optional callback to refresh stream definition
}

export const createDatasetQualityDetailsControllerStateMachine = ({
  initialContext,
  plugins,
  toasts,
  dataStreamDetailsClient,
  streamsRepositoryClient,
  refreshDefinition,
}: DatasetQualityDetailsControllerStateMachineDependencies) =>
  createPureDatasetQualityDetailsControllerStateMachine(initialContext).provide({
    actions: {
      notifyFailedFetchForAggregatableDatasets: ({ event }) => {
        if ('error' in event)
          fetchNonAggregatableDatasetsFailedNotifier(toasts, event.error as Error);
      },
      notifyFetchDataStreamDetailsFailed: ({ event }) => {
        if ('error' in event) fetchDataStreamDetailsFailedNotifier(toasts, event.error as Error);
      },
      notifyCheckBreakdownFieldIsEcsFailed: ({ event }) => {
        if ('error' in event) assertBreakdownFieldEcsFailedNotifier(toasts, event.error as Error);
      },
      notifyFetchDataStreamSettingsFailed: ({ event }) => {
        if ('error' in event) fetchDataStreamSettingsFailedNotifier(toasts, event.error as Error);
      },
      notifyFetchIntegrationDashboardsFailed: ({ event }) => {
        if ('error' in event)
          fetchIntegrationDashboardsFailedNotifier(toasts, event.error as Error);
      },
      notifyFetchDatasetIntegrationsFailed: ({ event }) => {
        if ('error' in event)
          fetchDataStreamIntegrationFailedNotifier(toasts, event.error as Error);
      },
      notifySaveNewFieldLimitError: ({ event }) => {
        if ('error' in event) updateFieldLimitFailedNotifier(toasts, event.error as Error);
      },
      notifyRolloverDataStreamError: ({ context, event }) => {
        if ('error' in event)
          rolloverDataStreamFailedNotifier(toasts, event.error as Error, context.dataStream);
      },
      notifyUpdateFailureStoreSuccess: () => updateFailureStoreSuccessNotifier(toasts),
      notifyUpdateFailureStoreFailed: ({ event }) => {
        if ('error' in event) updateFailureStoreFailedNotifier(toasts, event.error as Error);
      },
    },
    actors: {
      checkDatasetIsAggregatable: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          const { startDate: start, endDate: end } = getDateISORange(context.timeRange);
          return dataStreamDetailsClient.getNonAggregatableDatasets({
            start,
            end,
            dataStream: context.dataStream,
          });
        }
      ),
      loadDataStreamDetails: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          const { startDate: start, endDate: end } = getDateISORange(context.timeRange);
          return dataStreamDetailsClient.getDataStreamDetails({
            dataStream: context.dataStream,
            start,
            end,
          });
        }
      ),
      checkBreakdownFieldIsEcs: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          if (context.breakdownField) {
            const allowedFieldSources = ['ecs', 'metadata'];
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
        }
      ),
      loadFailedDocsDetails: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          const { startDate: start, endDate: end } = getDateISORange(context.timeRange);
          return dataStreamDetailsClient.getFailedDocsDetails({
            dataStream: context.dataStream,
            start,
            end,
          });
        }
      ),
      loadDegradedFields: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
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
          return undefined;
        }
      ),
      loadDegradedFieldValues: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          if ('expandedQualityIssue' in context && context.expandedQualityIssue) {
            return dataStreamDetailsClient.getDataStreamDegradedFieldValues({
              dataStream: context.dataStream,
              degradedField: context.expandedQualityIssue.name,
            });
          }
          return undefined;
        }
      ),
      analyzeDegradedField: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
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
          return undefined;
        }
      ),
      loadfailedDocsErrors: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          if ('expandedQualityIssue' in context && context.expandedQualityIssue) {
            const { startDate: start, endDate: end } = getDateISORange(context.timeRange);
            return dataStreamDetailsClient.getFailedDocsErrors({
              dataStream: context.dataStream,
              start,
              end,
            });
          }
          return undefined;
        }
      ),
      loadDataStreamSettings: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          return dataStreamDetailsClient.getDataStreamSettings({
            dataStream: context.dataStream,
          });
        }
      ),
      checkAndLoadIntegration: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          return dataStreamDetailsClient.checkAndLoadIntegration({
            dataStream: context.dataStream,
          });
        }
      ),
      loadIntegrationDashboards: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          if ('integration' in context && context.integration && context.integration.integration) {
            return dataStreamDetailsClient.getIntegrationDashboards({
              integration: context.integration.integration.name,
            });
          }
          return undefined;
        }
      ),
      saveNewFieldLimit: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          if ('fieldLimit' in context && context.fieldLimit && context.fieldLimit.newFieldLimit) {
            return dataStreamDetailsClient.setNewFieldLimit({
              dataStream: context.dataStream,
              newFieldLimit: context.fieldLimit.newFieldLimit,
            });
          }
          return undefined;
        }
      ),
      rolloverDataStream: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          return dataStreamDetailsClient.rolloverDataStream({
            dataStream: context.dataStream,
          });
        }
      ),
      updateFailureStore: fromPromise(
        async ({ input: context }: { input: DatasetQualityDetailsControllerContext }) => {
          if (!('dataStreamDetails' in context) || !context.dataStreamDetails) {
            return;
          }
          if (context.view === 'dataQuality') {
            const { failureStoreDataQualityConfig } = context.dataStreamDetails;
            if (!failureStoreDataQualityConfig) {
              return;
            }
            const { failureStoreEnabled, customRetentionPeriod } = failureStoreDataQualityConfig;
            await dataStreamDetailsClient.updateFailureStore({
              dataStream: context.dataStream,
              failureStoreEnabled,
              customRetentionPeriod,
            });
            return;
          }
          const { failureStoreStreamConfig } = context.dataStreamDetails;
          if (!failureStoreStreamConfig || !streamsRepositoryClient || !context.streamDefinition) {
            return;
          }
          await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
            signal: null,
            params: {
              path: { name: context.dataStream },
              body: {
                ingest: {
                  ...context.streamDefinition.stream.ingest,
                  processing: omit(context.streamDefinition.stream.ingest.processing, 'updated_at'),
                  failure_store: failureStoreStreamConfig,
                },
              },
            },
          });
          if (refreshDefinition) {
            refreshDefinition();
          }
        }
      ),
    },
  });

export type DatasetQualityDetailsControllerStateService = ActorRefFrom<
  ReturnType<typeof createDatasetQualityDetailsControllerStateMachine>
>;
