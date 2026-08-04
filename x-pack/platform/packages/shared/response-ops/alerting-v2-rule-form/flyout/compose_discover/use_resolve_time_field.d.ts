import type { HttpStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';
interface UseResolveTimeFieldParams {
    /** Full ES|QL query or FROM-only query used to resolve index date fields. */
    query: string;
    timeField: string;
    onTimeFieldChange?: (timeField: string) => void;
    http: HttpStart;
    dataViews: DataViewsPublicPluginStart;
    /**
     * When provided, ES|QL column introspection is used for field discovery instead
     * of the DataView field-caps API. Preferred for all ES|QL sources because it
     * reflects the actual schema the query will return; required for federated sources
     * that don't exist as Elasticsearch indices.
     */
    search?: ISearchGeneric;
    /** When false, skips field resolution and auto-correction. Defaults to true. */
    enabled?: boolean;
}
/**
 * Resolves the correct time field for an ES|QL rule by inspecting the source
 * index (FROM-only query). Falls back to the ES|QL timefield API when field
 * caps return no date fields. Auto-corrects `timeField` when it does not
 * exist on the index (e.g. default `@timestamp` on `kibana_sample_data_flights`).
 */
export declare const useResolveTimeField: ({ query, timeField, onTimeFieldChange, http, dataViews, search, enabled, }: UseResolveTimeFieldParams) => {
    timeFieldOptions: {
        value: string;
        text: string;
    }[];
    isTimeFieldResolved: boolean;
};
export {};
