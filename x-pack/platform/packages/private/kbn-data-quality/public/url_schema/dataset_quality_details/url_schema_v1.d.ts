import type { DatasetQualityDetailsPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import * as rt from 'io-ts';
import { datasetQualityDetailsUrlSchemaV1 } from '../../../common/url_schema';
export declare const getStateFromUrlValue: (urlValue: datasetQualityDetailsUrlSchemaV1.UrlSchema) => DatasetQualityDetailsPublicStateUpdate;
export declare const getUrlValueFromState: (state: DatasetQualityDetailsPublicStateUpdate) => datasetQualityDetailsUrlSchemaV1.UrlSchema;
export declare const stateFromUntrustedUrlRT: rt.Type<DatasetQualityDetailsPublicStateUpdate, {
    dataStream: string;
} & {
    v?: 1 | undefined;
    timeRange?: {
        from: string;
        to: string;
        refresh: {
            pause: boolean;
            value: number;
        };
    } | undefined;
    breakdownField?: string | undefined;
    degradedFields?: {
        table?: {
            page?: number | undefined;
            rowsPerPage?: number | undefined;
            sort?: {
                field: string;
                direction: "asc" | "desc";
            } | undefined;
        } | undefined;
    } | undefined;
    expandedDegradedField?: string | undefined;
    showCurrentQualityIssues?: boolean | undefined;
}, unknown>;
