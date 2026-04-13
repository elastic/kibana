import React from 'react';
import type { FailedDocsError, QualityIssue } from '../../common/api_types';
import type { SortDirection } from '../../common/types';
import type { QualityIssueType } from '../state_machines/dataset_quality_details_controller';
export type QualityIssueSortField = keyof QualityIssue;
export type FailedDocsErrorSortField = keyof FailedDocsError;
export declare function useQualityIssues(): {
    isDegradedFieldsLoading: boolean;
    pagination: {
        pageIndex: number;
        pageSize: number;
        totalItemCount: number;
        hidePerPageOptions: boolean;
    };
    onTableChange: (options: {
        page: {
            index: number;
            size: number;
        };
        sort?: {
            field: QualityIssueSortField;
            direction: SortDirection;
        };
    }) => void;
    renderedItems: ({
        count: number;
        lastOccurrence: number | null | undefined;
        timeSeries: {
            x: number;
            y: number;
        }[];
    } & {
        indexFieldWasLastPresentIn?: string | undefined;
    } & {
        name: string;
        type: "degraded" | "failed";
    })[];
    sort: {
        sort: {
            field: "type" | "lastOccurrence" | "name" | "count" | "timeSeries" | "indexFieldWasLastPresentIn";
            direction: SortDirection;
        };
    };
    fieldFormats: import("@kbn/field-formats-plugin/public").FieldFormatsStart;
    totalItemCount: number;
    expandedDegradedField: {
        name: string;
        type: QualityIssueType;
    } | undefined;
    openDegradedFieldFlyout: (fieldName: string, qualityIssueType: QualityIssueType) => void;
    closeDegradedFieldFlyout: () => void;
    degradedFieldValues: {
        field: string;
        values: string[];
    } | undefined;
    isDegradedFieldsValueLoading: boolean;
    isAnalysisInProgress: boolean;
    degradedFieldAnalysis: ({
        isFieldLimitIssue: boolean;
        fieldCount: number;
        totalFieldLimit: number;
    } & {
        ignoreMalformed?: boolean | undefined;
        nestedFieldLimit?: number | undefined;
        fieldMapping?: {
            type?: string | undefined;
            ignore_above?: number | undefined;
        } | undefined;
        defaultPipeline?: string | undefined;
    }) | undefined;
    degradedFieldAnalysisFormattedResult: {
        isFieldLimitIssue: boolean;
        potentialCause: string;
        tooltipContent: string;
        shouldDisplayIgnoredValuesAndLimit: boolean;
        identifiedUsingHeuristics: boolean;
        isFieldCharacterLimitIssue?: undefined;
        isFieldMalformedIssue?: undefined;
    } | {
        isFieldCharacterLimitIssue: boolean;
        potentialCause: string;
        tooltipContent: string;
        shouldDisplayIgnoredValuesAndLimit: boolean;
        identifiedUsingHeuristics: boolean;
        isFieldLimitIssue?: undefined;
        isFieldMalformedIssue?: undefined;
    } | {
        isFieldMalformedIssue: boolean;
        potentialCause: string;
        tooltipContent: string;
        shouldDisplayIgnoredValuesAndLimit: boolean;
        identifiedUsingHeuristics: boolean;
        isFieldLimitIssue?: undefined;
        isFieldCharacterLimitIssue?: undefined;
    } | undefined;
    expandedRenderedItem: ({
        count: number;
        lastOccurrence: number | null | undefined;
        timeSeries: {
            x: number;
            y: number;
        }[];
    } & {
        indexFieldWasLastPresentIn?: string | undefined;
    } & {
        name: string;
        type: "degraded" | "failed";
    }) | undefined;
    updateNewFieldLimit: (newFieldLimit: number) => void;
    isMitigationInProgress: boolean;
    isRolloverInProgress: boolean;
    newFieldLimitData: import("../state_machines/dataset_quality_details_controller").FieldLimit | undefined;
    isRolloverRequired: boolean;
    isMitigationAppliedSuccessfully: boolean;
    triggerRollover: () => void;
    renderedFailedDocsErrorsItems: {
        message: string;
        type: string;
    }[];
    failedDocsErrorsSort: {
        sort: {
            field: "type" | "message";
            direction: SortDirection;
        };
    };
    resultsCount: React.JSX.Element;
    failedDocsErrorsColumns: import("@elastic/eui/src/components/basic_table/basic_table").EuiBasicTableColumn<{
        message: string;
        type: string;
    }>[];
    isFailedDocsErrorsLoading: boolean;
    failedDocsErrorsPagination: {
        pageIndex: number;
        pageSize: number;
        totalItemCount: number;
        hidePerPageOptions: boolean;
    };
    onFailedDocsErrorsTableChange: (options: {
        page: {
            index: number;
            size: number;
        };
        sort?: {
            field: FailedDocsErrorSortField;
            direction: SortDirection;
        };
    }) => void;
};
