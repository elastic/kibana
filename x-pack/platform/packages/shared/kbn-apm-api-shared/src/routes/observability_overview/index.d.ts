export declare const observabilityOverviewRouteDefinitions: {
    observabilityOverviewHasData: {
        endpoint: "GET /internal/apm/observability_overview/has_data";
        params?: undefined;
    } & import("../types").WithResponse<import("./observability_overview_has_data").ObservabilityOverviewHasDataResponse>;
    observabilityOverview: {
        endpoint: "GET /internal/apm/observability_overview";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                bucketSize: import("zod").ZodCoercedNumber<unknown>;
                intervalString: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./observability_overview").ObservabilityOverviewResponse>;
};
export type { ObservabilityOverviewHasDataResponse } from './observability_overview_has_data';
export type { ObservabilityOverviewResponse } from './observability_overview';
