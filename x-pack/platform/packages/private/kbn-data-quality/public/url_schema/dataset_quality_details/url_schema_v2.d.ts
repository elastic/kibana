import type { DatasetQualityDetailsPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import * as rt from 'io-ts';
import { datasetQualityDetailsUrlSchemaV2 } from '../../../common/url_schema';
export declare const getStateFromUrlValue: (urlValue: datasetQualityDetailsUrlSchemaV2.UrlSchema) => DatasetQualityDetailsPublicStateUpdate;
export declare const getUrlValueFromState: (state: DatasetQualityDetailsPublicStateUpdate) => datasetQualityDetailsUrlSchemaV2.UrlSchema;
export declare const stateFromUntrustedUrlRT: rt.Type<DatasetQualityDetailsPublicStateUpdate, ({
    dataStream: string;
    view: "classic";
} & {
    v?: 2 | undefined;
    timeRange?: {
        from: string;
        to: string;
        refresh: {
            pause: boolean;
            value: number;
        };
    } | undefined;
    qualityIssuesChart?: "degraded" | "failed" | undefined;
    breakdownField?: string | undefined;
    qualityIssues?: {
        table?: {
            page?: number | undefined;
            rowsPerPage?: number | undefined;
            sort?: {
                field: string;
                direction: "asc" | "desc";
            } | undefined;
        } | undefined;
    } | undefined;
    expandedQualityIssue?: {
        name: string;
        type: "degraded" | "failed";
    } | undefined;
    showCurrentQualityIssues?: boolean | undefined;
}) | ({
    dataStream: string;
    view: "wired";
} & {
    v?: 2 | undefined;
    timeRange?: {
        from: string;
        to: string;
        refresh: {
            pause: boolean;
            value: number;
        };
    } | undefined;
    qualityIssuesChart?: "degraded" | "failed" | undefined;
    breakdownField?: string | undefined;
    qualityIssues?: {
        table?: {
            page?: number | undefined;
            rowsPerPage?: number | undefined;
            sort?: {
                field: string;
                direction: "asc" | "desc";
            } | undefined;
        } | undefined;
    } | undefined;
    expandedQualityIssue?: {
        name: string;
        type: "degraded" | "failed";
    } | undefined;
    showCurrentQualityIssues?: boolean | undefined;
}) | ({
    dataStream: string;
} & {
    v?: 2 | undefined;
    timeRange?: {
        from: string;
        to: string;
        refresh: {
            pause: boolean;
            value: number;
        };
    } | undefined;
    qualityIssuesChart?: "degraded" | "failed" | undefined;
    breakdownField?: string | undefined;
    qualityIssues?: {
        table?: {
            page?: number | undefined;
            rowsPerPage?: number | undefined;
            sort?: {
                field: string;
                direction: "asc" | "desc";
            } | undefined;
        } | undefined;
    } | undefined;
    expandedQualityIssue?: {
        name: string;
        type: "degraded" | "failed";
    } | undefined;
    showCurrentQualityIssues?: boolean | undefined;
}), unknown>;
