import type { HttpStart } from '@kbn/core-http-browser';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
export interface UseAlertingEpisodesDataViewOptions {
    services: {
        dataViews: DataViewsContract;
        http: HttpStart;
        spaces: SpacesPluginStart;
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
export declare const useAlertingEpisodesDataView: ({ services }: UseAlertingEpisodesDataViewOptions) => import("@kbn/data-views-plugin/public").DataView | undefined;
