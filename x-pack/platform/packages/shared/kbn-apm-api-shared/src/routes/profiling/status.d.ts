export interface ProfilingStatusResponse {
    initialized: boolean;
}
export declare const profilingStatusRoute: {
    endpoint: "GET /internal/apm/profiling/status";
    params?: undefined;
} & import("../types").WithResponse<ProfilingStatusResponse>;
