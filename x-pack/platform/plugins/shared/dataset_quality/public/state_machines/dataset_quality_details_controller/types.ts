/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailureStore, Streams } from '@kbn/streams-schema';
import type {
  Dashboard,
  DataStreamSettings,
  DegradedFieldAnalysis,
  DegradedFieldValues,
  FailedDocsError,
  QualityIssue,
  UpdateFieldLimitResponse,
  DataStreamDetails,
} from '../../../common/api_types';
import type { IntegrationType } from '../../../common/data_stream_details';
import type { TableCriteria, TimeRangeConfig } from '../../../common/types';
import type { FailedDocsErrorSortField, QualityIssueSortField } from '../../hooks';
import type { DatasetQualityView } from '../../controller/dataset_quality_details';

export type QualityIssueType = QualityIssue['type'];

export interface DataStream {
  name: string;
  type: string;
  namespace: string;
  rawName: string;
}

export interface QualityIssuesTableConfig {
  table: TableCriteria<QualityIssueSortField>;
  data?: QualityIssue[];
}

export interface QualityIssuesWithData {
  table: TableCriteria<QualityIssueSortField>;
  data: QualityIssue[];
}

export interface FailedDocsErrorsTableConfig {
  table: TableCriteria<FailedDocsErrorSortField>;
  data?: FailedDocsError[];
}

export interface FailedDocsErrorsWithData {
  table: TableCriteria<FailedDocsErrorSortField>;
  data: QualityIssue[];
}

export interface FieldLimit {
  newFieldLimit?: number;
  result?: UpdateFieldLimitResponse;
  error?: boolean;
}

export interface StreamsUrls {
  processingUrl?: string;
  schemaUrl?: string;
}

export interface WithDefaultControllerState {
  dataStream: string;
  qualityIssues: QualityIssuesTableConfig;
  failedDocsErrors: FailedDocsErrorsTableConfig;
  timeRange: TimeRangeConfig;
  showCurrentQualityIssues: boolean;
  selectedIssueTypes: string[];
  selectedFields: string[];
  qualityIssuesChart: QualityIssueType;
  breakdownField?: string;
  isBreakdownFieldEcs?: boolean;
  isIndexNotFoundError?: boolean;
  integration?: IntegrationType;
  expandedQualityIssue?: {
    name: string;
    type: QualityIssueType;
  };
  isNonAggregatable?: boolean;
  fieldLimit?: FieldLimit;
  view: DatasetQualityView;
  streamDefinition?: Streams.ingest.all.GetResponse;
  streamsUrls?: StreamsUrls;
}

export interface WithDataStreamDetails {
  dataStreamDetails: DataStreamDetailsWithFailureStoreConfig;
}

export interface WithBreakdownField {
  breakdownField: string | undefined;
}

export interface WithBreakdownInEcsCheck {
  isBreakdownFieldEcs: boolean;
}

export interface WithQualityIssuesData {
  qualityIssues: QualityIssuesWithData;
}

export interface WithFailedDocsErrorsData {
  failedDocsErrors: FailedDocsErrorsWithData;
}

export interface WithNonAggregatableDatasetStatus {
  isNonAggregatable: boolean;
}

export interface WithDataStreamSettings {
  dataStreamSettings: DataStreamSettings;
}

export interface WithIntegration {
  integration: IntegrationType;
}

export interface WithIntegrationDashboards {
  integrationDashboards: Dashboard[];
}

export interface WithDegradedFieldValues {
  degradedFieldValues: DegradedFieldValues;
}

export interface WithDegradeFieldAnalysis {
  degradedFieldAnalysis: DegradedFieldAnalysis;
}

export interface WithNewFieldLimit {
  fieldLimit?: FieldLimit & {
    newFieldLimit: number;
  };
}

export interface WithNewFieldLimitResponse {
  fieldLimit: FieldLimit;
}

export interface DataStreamDetailsWithFailureStoreConfig extends DataStreamDetails {
  failureStoreDataQualityConfig?: {
    failureStoreEnabled: boolean;
    customRetentionPeriod?: string;
  };
  failureStoreStreamConfig?: FailureStore;
}

export type DefaultDatasetQualityDetailsContext = Pick<
  WithDefaultControllerState,
  | 'qualityIssues'
  | 'failedDocsErrors'
  | 'timeRange'
  | 'isIndexNotFoundError'
  | 'showCurrentQualityIssues'
  | 'selectedIssueTypes'
  | 'selectedFields'
  | 'qualityIssuesChart'
  | 'view'
  | 'streamDefinition'
  | 'streamsUrls'
>;

export type DatasetQualityDetailsControllerTypeState =
  | {
      value:
        | 'initializing'
        | 'initializing.nonAggregatableDataset.fetching'
        | 'initializing.dataStreamDetails.fetching'
        | 'initializing.dataStreamSettings.fetchingDataStreamSettings'
        | 'initializing.dataStreamSettings.errorFetchingDataStreamSettings'
        | 'initializing.checkAndLoadIntegrationAndDashboards.checkingAndLoadingIntegration';
      context: WithDefaultControllerState;
    }
  | {
      value: 'initializing.nonAggregatableDataset.done';
      context: WithDefaultControllerState & WithNonAggregatableDatasetStatus;
    }
  | {
      value: 'initializing.dataStreamDetails.done';
      context: WithDefaultControllerState & WithDataStreamDetails;
    }
  | {
      value: 'initializing.checkBreakdownFieldIsEcs.fetching';
      context: WithDefaultControllerState & WithBreakdownField;
    }
  | {
      value: 'initializing.checkBreakdownFieldIsEcs.done';
      context: WithDefaultControllerState & WithBreakdownInEcsCheck;
    }
  | {
      value:
        | 'initializing.dataStreamSettings.doneFetchingQualityIssues'
        | 'initializing.dataStreamSettings.qualityIssues.dataStreamDegradedFields.fetchingDataStreamDegradedFields'
        | 'initializing.dataStreamSettings.qualityIssues.dataStreamDegradedFields.errorFetchingDegradedFields'
        | 'initializing.dataStreamSettings.qualityIssues.dataStreamFailedDocs.pending'
        | 'initializing.dataStreamSettings.qualityIssues.dataStreamFailedDocs.fetchingFailedDocs'
        | 'initializing.dataStreamSettings.qualityIssues.dataStreamFailedDocs.errorFetchingFailedDocs';
      context: WithDefaultControllerState & WithDataStreamSettings;
    }
  | {
      value:
        | 'initializing.dataStreamSettings.qualityIssues.dataStreamDegradedFields.doneFetchingDegradedFields'
        | 'initializing.dataStreamSettings.qualityIssues.dataStreamFailedDocs.doneFetchingFailedDocs';
      context: WithDefaultControllerState & WithDataStreamSettings & WithQualityIssuesData;
    }
  | {
      value:
        | 'initializing.checkAndLoadIntegrationAndDashboards.loadingIntegrationDashboards'
        | 'initializing.checkAndLoadIntegrationAndDashboards.unauthorizedToLoadDashboards';
      context: WithDefaultControllerState & WithIntegration;
    }
  | {
      value: 'initializing.checkAndLoadIntegrationAndDashboards.done';
      context: WithDefaultControllerState & WithIntegration & WithIntegrationDashboards;
    }
  | {
      value: 'initializing.qualityIssueFlyout.open';
      context: WithDefaultControllerState;
    }
  | {
      value:
        | 'initializing.qualityIssueFlyout.open.degradedFieldFlyout.ignoredValues.fetching'
        | 'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.analyzing'
        | 'initializing.qualityIssueFlyout.open.failedDocsFlyout.fetching';
      context: WithDefaultControllerState & WithQualityIssuesData;
    }
  | {
      value: 'initializing.qualityIssueFlyout.open.degradedFieldFlyout.ignoredValues.done';
      context: WithDefaultControllerState & WithQualityIssuesData & WithDegradedFieldValues;
    }
  | {
      value:
        | 'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.analyzed'
        | 'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.mitigating'
        | 'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.askingForRollover'
        | 'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.rollingOver'
        | 'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.success'
        | 'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.error';
      context: WithDefaultControllerState & WithQualityIssuesData & WithDegradeFieldAnalysis;
    }
  | {
      value: 'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.success';
      context: WithDefaultControllerState &
        WithQualityIssuesData &
        WithDegradedFieldValues &
        WithDegradeFieldAnalysis &
        WithNewFieldLimit &
        WithNewFieldLimitResponse;
    }
  | {
      value: 'initializing.failureStoreUpdate.idle';
      context: WithDefaultControllerState;
    }
  | {
      value: 'initializing.failureStoreUpdate.updating';
      context: WithDefaultControllerState;
    };

export type DatasetQualityDetailsControllerContext =
  DatasetQualityDetailsControllerTypeState['context'];

export type DatasetQualityDetailsControllerEvent =
  | {
      type: 'UPDATE_TIME_RANGE';
      timeRange: TimeRangeConfig;
    }
  | {
      type: 'OPEN_QUALITY_ISSUE_FLYOUT';
      qualityIssue: {
        name: string;
        type: QualityIssueType;
      };
    }
  | {
      type: 'CLOSE_DEGRADED_FIELD_FLYOUT';
    }
  | {
      type: 'DEGRADED_FIELDS_LOADED';
    }
  | {
      type: 'QUALITY_ISSUES_CHART_CHANGE';
      qualityIssuesChart: QualityIssueType;
    }
  | {
      type: 'BREAKDOWN_FIELD_CHANGE';
      breakdownField: string | undefined;
    }
  | {
      type: 'UPDATE_QUALITY_ISSUES_TABLE_CRITERIA';
      quality_issues_criteria: TableCriteria<QualityIssueSortField>;
    }
  | {
      type: 'UPDATE_FAILED_DOCS_ERRORS_TABLE_CRITERIA';
      failed_docs_errors_criteria: TableCriteria<FailedDocsErrorSortField>;
    }
  | {
      type: 'SET_NEW_FIELD_LIMIT';
      newFieldLimit: number;
    }
  | {
      type: 'ROLLOVER_DATA_STREAM';
    }
  | {
      type: 'UPDATE_SELECTED_ISSUE_TYPES';
      selectedIssueTypes: string[];
    }
  | {
      type: 'UPDATE_SELECTED_FIELDS';
      selectedFields: string[];
    }
  | {
      type: 'UPDATE_FAILURE_STORE';
      dataStreamsDetails: DataStreamDetailsWithFailureStoreConfig;
    }
  | {
      type: 'TOGGLE_CURRENT_QUALITY_ISSUES';
    };
