export interface ObservabilityOverviewHasDataResponse {
    hasData: boolean;
    indices: Readonly<{
        error: string;
        onboarding: string;
        span: string;
        transaction: string;
        metric: string;
    }>;
}
export declare const observabilityOverviewHasDataRoute: {
    endpoint: "GET /internal/apm/observability_overview/has_data";
    params?: undefined;
} & import("../types").WithResponse<ObservabilityOverviewHasDataResponse>;
