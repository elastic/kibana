export declare const agentConfigurationRouteDefinitions: {
    list: {
        endpoint: "GET /api/apm/settings/agent-configuration 2023-10-31";
        params?: undefined;
    } & import("../types").WithResponse<import("./list_configurations").ListAgentConfigurationsResponse>;
    getSingle: {
        endpoint: "GET /api/apm/settings/agent-configuration/view 2023-10-31";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodObject<{
                name: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-common").AgentConfiguration>;
    delete: {
        endpoint: "DELETE /api/apm/settings/agent-configuration 2023-10-31";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                service: import("zod").ZodObject<{
                    name: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./delete_configuration").DeleteAgentConfigurationResponse>;
    createOrUpdate: {
        endpoint: "PUT /api/apm/settings/agent-configuration 2023-10-31";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodObject<{
                overwrite: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
            }, import("zod/v4/core").$strip>>;
            body: import("zod").ZodObject<{
                agent_name: import("zod").ZodOptional<import("zod").ZodString>;
                service: import("zod").ZodObject<{
                    name: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
                settings: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<void>;
    search: {
        endpoint: "POST /api/apm/settings/agent-configuration/search 2023-10-31";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                service: import("zod").ZodObject<{
                    name: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
                etag: import("zod").ZodOptional<import("zod").ZodString>;
                mark_as_applied_by_agent: import("zod").ZodOptional<import("zod").ZodBoolean>;
                error: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./search_configuration").SearchAgentConfigurationResponse>;
    listEnvironments: {
        endpoint: "GET /api/apm/settings/agent-configuration/environments 2023-10-31";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodObject<{
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./list_environments").ListAgentConfigurationEnvironmentsResponse>;
    agentName: {
        endpoint: "GET /api/apm/settings/agent-configuration/agent_name 2023-10-31";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./get_agent_name").AgentConfigurationAgentNameResponse>;
};
export type { ListAgentConfigurationsResponse } from './list_configurations';
export type { GetSingleAgentConfigurationResponse } from './get_single_configuration';
export type { DeleteAgentConfigurationResponse } from './delete_configuration';
export type { AgentConfigSearchParams, SearchAgentConfigurationResponse, } from './search_configuration';
export type { AgentConfigurationEnvironmentsResponse, ListAgentConfigurationEnvironmentsResponse, } from './list_environments';
export type { AgentConfigurationAgentNameResponse } from './get_agent_name';
