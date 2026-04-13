import type { IToasts } from '@kbn/core-notifications-browser';
import type { ActorRefFrom } from 'xstate';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { IDataStreamDetailsClient } from '../../services/data_stream_details';
import type { DatasetQualityStartDeps } from '../../types';
import type { DatasetQualityDetailsControllerContext } from './types';
export declare const createPureDatasetQualityDetailsControllerStateMachine: (initialContext: DatasetQualityDetailsControllerContext) => import("xstate").StateMachine<import("./types").WithDefaultControllerState | (import("./types").WithDefaultControllerState & import("./types").WithNonAggregatableDatasetStatus) | (import("./types").WithDefaultControllerState & import("./types").WithDataStreamDetails) | (import("./types").WithDefaultControllerState & import("./types").WithBreakdownField) | (import("./types").WithDefaultControllerState & import("./types").WithBreakdownInEcsCheck) | (import("./types").WithDefaultControllerState & import("./types").WithDataStreamSettings) | (import("./types").WithDefaultControllerState & import("./types").WithDataStreamSettings & import("./types").WithQualityIssuesData) | (import("./types").WithDefaultControllerState & import("./types").WithIntegration) | (import("./types").WithDefaultControllerState & import("./types").WithIntegration & import("./types").WithIntegrationDashboards) | (import("./types").WithDefaultControllerState & import("./types").WithQualityIssuesData) | (import("./types").WithDefaultControllerState & import("./types").WithQualityIssuesData & import("./types").WithDegradedFieldValues) | (import("./types").WithDefaultControllerState & import("./types").WithQualityIssuesData & import("./types").WithDegradeFieldAnalysis) | (import("./types").WithDefaultControllerState & import("./types").WithQualityIssuesData & import("./types").WithDegradedFieldValues & import("./types").WithDegradeFieldAnalysis & import("./types").WithNewFieldLimit & import("./types").WithNewFieldLimitResponse), {
    type: "UPDATE_TIME_RANGE";
    timeRange: import("../../../common/types").TimeRangeConfig;
} | {
    type: "OPEN_QUALITY_ISSUE_FLYOUT";
    qualityIssue: {
        name: string;
        type: import("./types").QualityIssueType;
    };
} | {
    type: "CLOSE_DEGRADED_FIELD_FLYOUT";
} | {
    type: "DEGRADED_FIELDS_LOADED";
} | {
    type: "QUALITY_ISSUES_CHART_CHANGE";
    qualityIssuesChart: import("./types").QualityIssueType;
} | {
    type: "BREAKDOWN_FIELD_CHANGE";
    breakdownField: string | undefined;
} | {
    type: "UPDATE_QUALITY_ISSUES_TABLE_CRITERIA";
    quality_issues_criteria: import("../../../common/types").TableCriteria<import("../../hooks").QualityIssueSortField>;
} | {
    type: "UPDATE_FAILED_DOCS_ERRORS_TABLE_CRITERIA";
    failed_docs_errors_criteria: import("../../../common/types").TableCriteria<import("../../hooks").FailedDocsErrorSortField>;
} | {
    type: "SET_NEW_FIELD_LIMIT";
    newFieldLimit: number;
} | {
    type: "ROLLOVER_DATA_STREAM";
} | {
    type: "UPDATE_SELECTED_ISSUE_TYPES";
    selectedIssueTypes: string[];
} | {
    type: "UPDATE_SELECTED_FIELDS";
    selectedFields: string[];
} | {
    type: "UPDATE_FAILURE_STORE";
    dataStreamsDetails: import("./types").DataStreamDetailsWithFailureStoreConfig;
} | {
    type: "TOGGLE_CURRENT_QUALITY_ISSUES";
}, Record<string, import("xstate").AnyActorRef>, import("xstate").ProvidedActor, import("xstate").ParameterizedObject, import("xstate").ParameterizedObject, string, import("xstate").StateValue, string, unknown, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, any>;
export interface DatasetQualityDetailsControllerStateMachineDependencies {
    initialContext: DatasetQualityDetailsControllerContext;
    plugins: DatasetQualityStartDeps;
    toasts: IToasts;
    dataStreamDetailsClient: IDataStreamDetailsClient;
    streamsRepositoryClient?: StreamsRepositoryClient;
    refreshDefinition?: () => void;
}
export declare const createDatasetQualityDetailsControllerStateMachine: ({ initialContext, plugins, toasts, dataStreamDetailsClient, streamsRepositoryClient, refreshDefinition, }: DatasetQualityDetailsControllerStateMachineDependencies) => import("xstate").StateMachine<import("./types").WithDefaultControllerState | (import("./types").WithDefaultControllerState & import("./types").WithNonAggregatableDatasetStatus) | (import("./types").WithDefaultControllerState & import("./types").WithDataStreamDetails) | (import("./types").WithDefaultControllerState & import("./types").WithBreakdownField) | (import("./types").WithDefaultControllerState & import("./types").WithBreakdownInEcsCheck) | (import("./types").WithDefaultControllerState & import("./types").WithDataStreamSettings) | (import("./types").WithDefaultControllerState & import("./types").WithDataStreamSettings & import("./types").WithQualityIssuesData) | (import("./types").WithDefaultControllerState & import("./types").WithIntegration) | (import("./types").WithDefaultControllerState & import("./types").WithIntegration & import("./types").WithIntegrationDashboards) | (import("./types").WithDefaultControllerState & import("./types").WithQualityIssuesData) | (import("./types").WithDefaultControllerState & import("./types").WithQualityIssuesData & import("./types").WithDegradedFieldValues) | (import("./types").WithDefaultControllerState & import("./types").WithQualityIssuesData & import("./types").WithDegradeFieldAnalysis) | (import("./types").WithDefaultControllerState & import("./types").WithQualityIssuesData & import("./types").WithDegradedFieldValues & import("./types").WithDegradeFieldAnalysis & import("./types").WithNewFieldLimit & import("./types").WithNewFieldLimitResponse), {
    type: "UPDATE_TIME_RANGE";
    timeRange: import("../../../common/types").TimeRangeConfig;
} | {
    type: "OPEN_QUALITY_ISSUE_FLYOUT";
    qualityIssue: {
        name: string;
        type: import("./types").QualityIssueType;
    };
} | {
    type: "CLOSE_DEGRADED_FIELD_FLYOUT";
} | {
    type: "DEGRADED_FIELDS_LOADED";
} | {
    type: "QUALITY_ISSUES_CHART_CHANGE";
    qualityIssuesChart: import("./types").QualityIssueType;
} | {
    type: "BREAKDOWN_FIELD_CHANGE";
    breakdownField: string | undefined;
} | {
    type: "UPDATE_QUALITY_ISSUES_TABLE_CRITERIA";
    quality_issues_criteria: import("../../../common/types").TableCriteria<import("../../hooks").QualityIssueSortField>;
} | {
    type: "UPDATE_FAILED_DOCS_ERRORS_TABLE_CRITERIA";
    failed_docs_errors_criteria: import("../../../common/types").TableCriteria<import("../../hooks").FailedDocsErrorSortField>;
} | {
    type: "SET_NEW_FIELD_LIMIT";
    newFieldLimit: number;
} | {
    type: "ROLLOVER_DATA_STREAM";
} | {
    type: "UPDATE_SELECTED_ISSUE_TYPES";
    selectedIssueTypes: string[];
} | {
    type: "UPDATE_SELECTED_FIELDS";
    selectedFields: string[];
} | {
    type: "UPDATE_FAILURE_STORE";
    dataStreamsDetails: import("./types").DataStreamDetailsWithFailureStoreConfig;
} | {
    type: "TOGGLE_CURRENT_QUALITY_ISSUES";
}, Record<string, import("xstate").AnyActorRef>, import("xstate").ProvidedActor, import("xstate").ParameterizedObject, import("xstate").ParameterizedObject, string, import("xstate").StateValue, string, unknown, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, any>;
export type DatasetQualityDetailsControllerStateService = ActorRefFrom<ReturnType<typeof createDatasetQualityDetailsControllerStateMachine>>;
