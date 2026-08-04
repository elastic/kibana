import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';
import type { HttpStart } from '@kbn/core-http-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
type Rule = FindRulesResponse['items'][number];
export interface UseAlertingRuleSourceDataViewsOptions {
    /** Cache of rules keyed by rule id (e.g. from `useAlertingRulesCache`). */
    rules: Record<string, Rule>;
    dataViews: DataViewsContract;
    http: HttpStart;
}
/**
 * Resolves the source data view for each rule from its root ES|QL query, so grouping values across
 * multiple rules (e.g. in the episodes list) can be formatted with the correct field metadata via
 * `fieldFormats`. Data views are cached by query string, so rules sharing a query resolve only once.
 */
export declare const useAlertingRuleSourceDataViews: ({ rules, dataViews, http, }: UseAlertingRuleSourceDataViewsOptions) => Map<string, DataView>;
export {};
