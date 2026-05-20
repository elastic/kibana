import type { HttpStart } from '@kbn/core-http-browser';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
export interface UseAlertingEpisodeSourceDataViewOptions {
    query?: string;
    services: {
        dataViews: DataViewsContract;
        http: HttpStart;
    };
}
/**
 * Creates an ad-hoc data view from the ES|QL query of the rule that produced
 * an alerting episode, so the episode source data can be rendered with the
 * correct field mappings.
 */
export declare const useAlertingEpisodeSourceDataView: ({ query, services, }: UseAlertingEpisodeSourceDataViewOptions) => import("react-use/lib/useAsyncFn").AsyncState<import("@kbn/data-views-plugin/public").DataView | undefined>;
