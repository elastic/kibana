import type { Type, TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    apm: Type<Readonly<{
        ui?: Readonly<{
            url?: string | undefined;
        } & {}> | undefined;
        url?: string | undefined;
        secret_token?: string | undefined;
    } & {}> | undefined>;
    base_url: Type<string | undefined>;
    cname: Type<string | undefined>;
    csp: Type<string | undefined>;
    deployments_url: Type<string>;
    deployment_url: Type<string | undefined>;
    id: Type<string | undefined>;
    isSaasContainer: Type<boolean | undefined>;
    organization_id: Type<string | undefined>;
    billing_url: Type<string | undefined>;
    performance_url: Type<string | undefined>;
    users_and_roles_url: Type<string | undefined>;
    organization_url: Type<string | undefined>;
    profile_url: Type<string | undefined>;
    projects_url: import("@kbn/config-schema").ConditionalType<true, string, string>;
    trial_end_date: Type<string | undefined>;
    is_elastic_staff_owned: Type<boolean | undefined>;
    onboarding: Type<Readonly<{
        default_solution?: string | undefined;
    } & {}> | undefined>;
    serverless: Type<Readonly<{
        project_type?: "search" | "security" | "observability" | "workplaceai" | "vectordb" | undefined;
        project_id?: string | undefined;
        project_name?: string | undefined;
        product_tier?: "complete" | "logs_essentials" | "essentials" | "search_ai_lake" | undefined;
        orchestrator_target?: string | undefined;
        in_trial?: boolean | undefined;
    } & {}> | undefined>;
}>;
export type CloudConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<CloudConfigType>;
export {};
