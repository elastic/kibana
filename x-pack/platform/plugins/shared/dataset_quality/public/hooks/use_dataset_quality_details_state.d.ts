import type { FailureStore } from '@kbn/streams-schema';
import type { BasicDataStream } from '../../common/types';
export declare const useDatasetQualityDetailsState: () => {
    service: import("xstate").ActorRef<import("xstate").MachineSnapshot<import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithNonAggregatableDatasetStatus) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithDataStreamDetails) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithBreakdownField) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithBreakdownInEcsCheck) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithDataStreamSettings) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithDataStreamSettings & import("../state_machines/dataset_quality_details_controller").WithQualityIssuesData) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithIntegration) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithIntegration & import("../state_machines/dataset_quality_details_controller").WithIntegrationDashboards) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithQualityIssuesData) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithQualityIssuesData & import("../state_machines/dataset_quality_details_controller").WithDegradedFieldValues) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithQualityIssuesData & import("../state_machines/dataset_quality_details_controller").WithDegradeFieldAnalysis) | (import("../state_machines/dataset_quality_details_controller").WithDefaultControllerState & import("../state_machines/dataset_quality_details_controller").WithQualityIssuesData & import("../state_machines/dataset_quality_details_controller").WithDegradedFieldValues & import("../state_machines/dataset_quality_details_controller").WithDegradeFieldAnalysis & import("../state_machines/dataset_quality_details_controller").WithNewFieldLimit & import("../state_machines/dataset_quality_details_controller").WithNewFieldLimitResponse), {
        type: "UPDATE_TIME_RANGE";
        timeRange: import("../../common/types").TimeRangeConfig;
    } | {
        type: "OPEN_QUALITY_ISSUE_FLYOUT";
        qualityIssue: {
            name: string;
            type: import("../state_machines/dataset_quality_details_controller").QualityIssueType;
        };
    } | {
        type: "CLOSE_DEGRADED_FIELD_FLYOUT";
    } | {
        type: "DEGRADED_FIELDS_LOADED";
    } | {
        type: "QUALITY_ISSUES_CHART_CHANGE";
        qualityIssuesChart: import("../state_machines/dataset_quality_details_controller").QualityIssueType;
    } | {
        type: "BREAKDOWN_FIELD_CHANGE";
        breakdownField: string | undefined;
    } | {
        type: "UPDATE_QUALITY_ISSUES_TABLE_CRITERIA";
        quality_issues_criteria: import("../../common/types").TableCriteria<import("./use_quality_issues").QualityIssueSortField>;
    } | {
        type: "UPDATE_FAILED_DOCS_ERRORS_TABLE_CRITERIA";
        failed_docs_errors_criteria: import("../../common/types").TableCriteria<import("./use_quality_issues").FailedDocsErrorSortField>;
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
        dataStreamsDetails: import("../state_machines/dataset_quality_details_controller").DataStreamDetailsWithFailureStoreConfig;
    } | {
        type: "TOGGLE_CURRENT_QUALITY_ISSUES";
    }, Record<string, import("xstate").AnyActorRef>, import("xstate").StateValue, string, import("xstate").NonReducibleUnknown, import("xstate").MetaObject, any>, {
        type: "UPDATE_TIME_RANGE";
        timeRange: import("../../common/types").TimeRangeConfig;
    } | {
        type: "OPEN_QUALITY_ISSUE_FLYOUT";
        qualityIssue: {
            name: string;
            type: import("../state_machines/dataset_quality_details_controller").QualityIssueType;
        };
    } | {
        type: "CLOSE_DEGRADED_FIELD_FLYOUT";
    } | {
        type: "DEGRADED_FIELDS_LOADED";
    } | {
        type: "QUALITY_ISSUES_CHART_CHANGE";
        qualityIssuesChart: import("../state_machines/dataset_quality_details_controller").QualityIssueType;
    } | {
        type: "BREAKDOWN_FIELD_CHANGE";
        breakdownField: string | undefined;
    } | {
        type: "UPDATE_QUALITY_ISSUES_TABLE_CRITERIA";
        quality_issues_criteria: import("../../common/types").TableCriteria<import("./use_quality_issues").QualityIssueSortField>;
    } | {
        type: "UPDATE_FAILED_DOCS_ERRORS_TABLE_CRITERIA";
        failed_docs_errors_criteria: import("../../common/types").TableCriteria<import("./use_quality_issues").FailedDocsErrorSortField>;
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
        dataStreamsDetails: import("../state_machines/dataset_quality_details_controller").DataStreamDetailsWithFailureStoreConfig;
    } | {
        type: "TOGGLE_CURRENT_QUALITY_ISSUES";
    }, import("xstate").EventObject>;
    telemetryClient: import("../services/telemetry").ITelemetryClient;
    fieldFormats: import("@kbn/field-formats-plugin/public").FieldFormatsStart;
    isIndexNotFoundError: boolean | undefined;
    dataStream: string;
    datasetDetails: BasicDataStream;
    qualityIssues: import("../state_machines/dataset_quality_details_controller").QualityIssuesTableConfig | (import("../state_machines/dataset_quality_details_controller").QualityIssuesTableConfig & import("../state_machines/dataset_quality_details_controller").QualityIssuesWithData);
    dataStreamDetails: import("../state_machines/dataset_quality_details_controller").DataStreamDetailsWithFailureStoreConfig | undefined;
    docsTrendChart: "degraded" | "failed";
    breakdownField: string | undefined;
    isBreakdownFieldEcs: boolean | undefined;
    isBreakdownFieldAsserted: boolean | "" | undefined;
    isNonAggregatable: boolean | undefined;
    timeRange: import("../../common/types").TimeRangeConfig;
    loadingState: {
        nonAggregatableDatasetLoading: boolean;
        dataStreamDetailsLoading: boolean;
        dataStreamSettingsLoading: boolean;
        integrationDetailsLoading: boolean;
        integrationDetailsLoaded: boolean;
        integrationDashboardsLoading: boolean;
    };
    updateTimeRange: ({ start, end }: {
        start: string;
        end: string;
    }) => void;
    updateFailureStore: ({ failureStoreDataQualityConfig, failureStoreStreamConfig, }: {
        failureStoreDataQualityConfig?: {
            failureStoreEnabled: boolean;
            customRetentionPeriod?: string;
        };
        failureStoreStreamConfig?: FailureStore;
    }) => void;
    dataStreamSettings: {
        lastBackingIndexName?: string | undefined;
        indexTemplate?: string | undefined;
        createdOn?: number | null | undefined;
        integration?: string | undefined;
        datasetUserPrivileges?: {
            datasetsPrivilages: {
                [x: string]: {
                    canMonitor: boolean;
                    canReadFailureStore: boolean;
                    canManageFailureStore: boolean;
                } & {
                    canRead: boolean;
                };
            };
            canViewIntegrations: boolean;
        } | undefined;
    } | undefined;
    integrationDetails: {
        integration: import("../../common/data_stream_details").IntegrationType | undefined;
        dashboard: {
            id: string;
            title: string;
        }[] | undefined;
    };
    canUserAccessDashboards: boolean;
    canUserViewIntegrations: boolean;
    canUserReadFailureStore: boolean;
    hasFailureStore: boolean;
    canShowFailureStoreInfo: boolean;
    expandedQualityIssue: {
        name: string;
        type: import("../state_machines/dataset_quality_details_controller").QualityIssueType;
    } | undefined;
    isQualityIssueFlyoutOpen: boolean;
    view: import("../controller/dataset_quality_details").DatasetQualityView;
    defaultRetentionPeriod: string | undefined;
    customRetentionPeriod: string | undefined;
    canUserManageFailureStore: boolean;
    streamDefinition: import("@kbn/streams-schema/src/models/ingest").IngestStream.all.GetResponse | undefined;
    streamsUrls: import("../state_machines/dataset_quality_details_controller").StreamsUrls | undefined;
};
