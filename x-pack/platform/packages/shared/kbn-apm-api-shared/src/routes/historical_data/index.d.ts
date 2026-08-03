export declare const historicalDataRouteDefinitions: {
    hasData: {
        endpoint: "GET /internal/apm/has_data";
        params?: undefined;
    } & import("../types").WithResponse<import("./has_data").HasDataResponse>;
};
export type { HasDataResponse } from './has_data';
