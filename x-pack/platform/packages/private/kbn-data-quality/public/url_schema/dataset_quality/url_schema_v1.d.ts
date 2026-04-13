import type { DatasetQualityPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality';
import * as rt from 'io-ts';
import { datasetQualityUrlSchemaV1 } from '../../../common/url_schema';
export declare const getStateFromUrlValue: (urlValue: datasetQualityUrlSchemaV1.UrlSchema) => DatasetQualityPublicStateUpdate;
export declare const getUrlValueFromState: (state: DatasetQualityPublicStateUpdate) => datasetQualityUrlSchemaV1.UrlSchema;
export declare const stateFromUntrustedUrlRT: rt.Type<Partial<import("@kbn/dataset-quality-plugin/public/controller/dataset_quality").DatasetQualityPublicState>, {
    v?: 1 | undefined;
    table?: {
        page?: number | undefined;
        rowsPerPage?: number | undefined;
        sort?: {
            field: string;
            direction: "asc" | "desc";
        } | undefined;
    } | undefined;
    filters?: {
        inactive?: boolean | undefined;
        fullNames?: boolean | undefined;
        timeRange?: {
            from: string;
            to: string;
            refresh: {
                pause: boolean;
                value: number;
            };
        } | undefined;
        types?: string[] | undefined;
        integrations?: string[] | undefined;
        namespaces?: string[] | undefined;
        qualities?: ("good" | "poor" | "degraded")[] | undefined;
        query?: string | undefined;
    } | undefined;
}, unknown>;
