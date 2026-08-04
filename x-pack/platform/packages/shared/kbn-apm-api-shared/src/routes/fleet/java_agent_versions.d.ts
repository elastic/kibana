export interface JavaAgentVersionsResponse {
    versions: string[] | undefined;
}
export declare const javaAgentVersionsRoute: {
    endpoint: "GET /internal/apm/fleet/java_agent_versions";
    params?: undefined;
} & import("../types").WithResponse<JavaAgentVersionsResponse>;
