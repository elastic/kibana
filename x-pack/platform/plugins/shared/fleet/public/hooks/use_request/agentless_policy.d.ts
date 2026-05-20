import type { CreateAgentlessPolicyRequest, DeleteAgentlessPolicyRequest } from '../../../common/types/rest_spec/agentless_policy';
export declare const sendCreateAgentlessPolicy: (body: CreateAgentlessPolicyRequest["body"], query?: CreateAgentlessPolicyRequest["query"]) => Promise<Readonly<{} & {
    item: Readonly<{
        namespace?: string | undefined;
        package?: Readonly<{
            title?: string | undefined;
            fips_compatible?: boolean | undefined;
            experimental_data_stream_features?: Readonly<{} & {
                features: Readonly<{
                    synthetic_source?: boolean | undefined;
                    tsdb?: boolean | undefined;
                    doc_value_only_numeric?: boolean | undefined;
                    doc_value_only_other?: boolean | undefined;
                } & {}>;
                data_stream: string;
            }>[] | undefined;
            requires_root?: boolean | undefined;
        } & {
            name: string;
            version: string;
        }> | undefined;
        elasticsearch?: Readonly<{
            privileges?: Readonly<{
                cluster?: string[] | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        description?: string | undefined;
        version?: string | undefined;
        overrides?: Readonly<{
            inputs?: Record<string, any> | undefined;
        } & {}> | null | undefined;
        agents?: number | undefined;
        condition?: string | undefined;
        policy_id?: string | null | undefined;
        spaceIds?: string[] | undefined;
        vars?: Record<string, Readonly<{
            type?: string | undefined;
            value?: any;
            frozen?: boolean | undefined;
        } & {}>> | Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
            id: string;
            isSecretRef: boolean;
        }> | null> | undefined;
        inputs?: Record<string, Readonly<{
            deprecated?: Readonly<{
                since?: string | undefined;
                replaced_by?: Record<"package" | "input" | "variable" | "dataStream" | "policyTemplate", string> | undefined;
            } & {
                description: string;
            }> | undefined;
            enabled?: boolean | undefined;
            streams?: Record<string, Readonly<{
                deprecated?: Readonly<{
                    since?: string | undefined;
                    replaced_by?: Record<"package" | "input" | "variable" | "dataStream" | "policyTemplate", string> | undefined;
                } & {
                    description: string;
                }> | undefined;
                enabled?: boolean | undefined;
                condition?: string | undefined;
                vars?: Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
                    id: string;
                    isSecretRef: boolean;
                }> | null> | undefined;
                var_group_selections?: Record<string, string> | undefined;
            } & {}>> | undefined;
            condition?: string | undefined;
            vars?: Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
                id: string;
                isSecretRef: boolean;
            }> | null> | undefined;
        } & {}>> | Readonly<{
            id?: string | undefined;
            name?: string | undefined;
            deprecated?: Readonly<{
                since?: string | undefined;
                replaced_by?: Record<"package" | "input" | "variable" | "dataStream" | "policyTemplate", string> | undefined;
            } & {
                description: string;
            }> | undefined;
            config?: Record<string, Readonly<{
                type?: string | undefined;
                value?: any;
                frozen?: boolean | undefined;
            } & {}>> | undefined;
            condition?: string | undefined;
            vars?: Record<string, Readonly<{
                type?: string | undefined;
                value?: any;
                frozen?: boolean | undefined;
            } & {}>> | undefined;
            migrate_from?: string | undefined;
            policy_template?: string | undefined;
            keep_enabled?: boolean | undefined;
            var_group_selections?: Record<string, string> | undefined;
            compiled_input?: any;
        } & {
            type: string;
            enabled: boolean;
            streams: Readonly<{
                id?: string | undefined;
                deprecated?: Readonly<{
                    since?: string | undefined;
                    replaced_by?: Record<"package" | "input" | "variable" | "dataStream" | "policyTemplate", string> | undefined;
                } & {
                    description: string;
                }> | undefined;
                config?: Record<string, Readonly<{
                    type?: string | undefined;
                    value?: any;
                    frozen?: boolean | undefined;
                } & {}>> | undefined;
                condition?: string | undefined;
                vars?: Record<string, Readonly<{
                    type?: string | undefined;
                    value?: any;
                    frozen?: boolean | undefined;
                } & {}>> | undefined;
                release?: "beta" | "experimental" | "ga" | undefined;
                migrate_from?: string | undefined;
                keep_enabled?: boolean | undefined;
                var_group_selections?: Record<string, string> | undefined;
                compiled_stream?: any;
            } & {
                enabled: boolean;
                data_stream: Readonly<{
                    type?: string | undefined;
                    elasticsearch?: Readonly<{
                        privileges?: Readonly<{
                            indices?: string[] | undefined;
                        } & {}> | undefined;
                        dynamic_dataset?: boolean | undefined;
                        dynamic_namespace?: boolean | undefined;
                    } & {}> | undefined;
                } & {
                    dataset: string;
                }>;
            }>[];
        }>[] | undefined;
        secret_references?: Readonly<{} & {
            id: string;
        }>[] | undefined;
        var_group_selections?: Record<string, string> | undefined;
        is_managed?: boolean | undefined;
        policy_ids?: string[] | undefined;
        output_id?: string | null | undefined;
        cloud_connector_id?: string | null | undefined;
        cloud_connector_name?: string | null | undefined;
        supports_agentless?: boolean | null | undefined;
        supports_cloud_connector?: boolean | null | undefined;
        additional_datastreams_permissions?: string[] | null | undefined;
        global_data_tags?: Readonly<{} & {
            name: string;
            value: string | number;
        }>[] | null | undefined;
        package_agent_version_condition?: string | undefined;
    } & {
        id: string;
        name: string;
        enabled: boolean;
        updated_at: string;
        updated_by: string;
        created_at: string;
        created_by: string;
        revision: number;
    }>;
}>>;
export declare const sendDeleteAgentlessPolicy: (policyId: string, query?: DeleteAgentlessPolicyRequest["query"]) => Promise<Readonly<{} & {
    id: string;
}>>;
