import type { HttpStart } from '@kbn/core-http-browser';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
export interface UseAlertingEpisodesDataViewOptions {
    query?: string;
    services: {
        dataViews: DataViewsContract;
        http: HttpStart;
    };
}
export interface KnownFieldOverrides {
    customLabel?: string;
    format?: Partial<SerializedFieldFormat>;
}
/**
 * Creates an ad-hoc data view for the alerting episodes query, enriching
 * known fields with display names and value formats.
 */
export declare const useAlertingEpisodesDataView: ({ query, services, }: UseAlertingEpisodesDataViewOptions) => import("@kbn/data-views-plugin/public").DataView | undefined;
