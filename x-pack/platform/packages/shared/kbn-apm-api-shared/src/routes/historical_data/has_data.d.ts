export interface HasDataResponse {
    hasData: boolean;
}
export declare const hasDataRoute: {
    endpoint: "GET /internal/apm/has_data";
    params?: undefined;
} & import("../types").WithResponse<HasDataResponse>;
