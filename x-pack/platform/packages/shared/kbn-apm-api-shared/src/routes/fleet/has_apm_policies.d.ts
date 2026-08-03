export interface HasApmPoliciesResponse {
    hasApmPolicies: boolean;
}
export declare const hasApmPoliciesRoute: {
    endpoint: "GET /internal/apm/fleet/has_apm_policies";
    params?: undefined;
} & import("../types").WithResponse<HasApmPoliciesResponse>;
