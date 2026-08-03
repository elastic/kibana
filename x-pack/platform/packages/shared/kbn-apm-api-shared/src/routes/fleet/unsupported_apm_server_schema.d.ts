export type UnsupportedApmServerSchema = Array<{
    key: string;
    value: unknown;
}>;
export interface UnsupportedApmServerSchemaResponse {
    unsupported: UnsupportedApmServerSchema;
}
export declare const unsupportedApmServerSchemaRoute: {
    endpoint: "GET /internal/apm/fleet/apm_server_schema/unsupported";
    params?: undefined;
} & import("../types").WithResponse<UnsupportedApmServerSchemaResponse>;
