export type ServiceGroupCounts = Record<string, {
    services: number;
    alerts: number;
}>;
export declare const serviceGroupCountsRoute: {
    endpoint: "GET /internal/apm/service-group/counts";
    params?: undefined;
} & import("../types").WithResponse<ServiceGroupCounts>;
