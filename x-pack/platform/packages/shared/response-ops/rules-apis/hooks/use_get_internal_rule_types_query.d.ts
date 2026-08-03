import type { HttpStart } from '@kbn/core-http-browser';
export declare const getKey: ({ includeAlertViewableTypes, }?: {
    includeAlertViewableTypes?: boolean;
}) => readonly [string, "getInternalRuleTypes", {
    readonly includeAlertViewableTypes: boolean;
}];
export interface UseGetInternalRuleTypesQueryParams {
    http: HttpStart;
    /**
     * When `true`, the query also includes rule types the user can read as alerts
     * (not only as rules). Alert views opt in so alerts-only users still receive a
     * non-empty list.
     */
    includeAlertViewableTypes?: boolean;
}
export declare const useGetInternalRuleTypesQuery: ({ http, includeAlertViewableTypes, }: UseGetInternalRuleTypesQueryParams) => import("@tanstack/react-query").UseQueryResult<import("../apis/get_internal_rule_types").InternalRuleType[], unknown>;
