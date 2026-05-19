export declare const PutPreconfigurationSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agentPolicies: import("@kbn/config-schema").Type<Readonly<{
            id?: string | number | undefined;
            namespace?: string | undefined;
            description?: string | undefined;
            overrides?: Record<string, any> | null | undefined;
            space_ids?: string[] | undefined;
            space_id?: string | undefined;
            is_default?: boolean | undefined;
            is_managed?: boolean | undefined;
            supports_agentless?: boolean | null | undefined;
            global_data_tags?: Readonly<{} & {
                name: string;
                value: string | number;
            }>[] | undefined;
            is_default_fleet_server?: boolean | undefined;
            has_fleet_server?: boolean | undefined;
            monitoring_enabled?: ("metrics" | "logs" | "traces")[] | undefined;
            unenroll_timeout?: number | undefined;
            data_output_id?: string | undefined;
            monitoring_output_id?: string | undefined;
            download_source_id?: string | null | undefined;
            fleet_server_host_id?: string | null | undefined;
            agent_features?: Readonly<{} & {
                name: string;
                enabled: boolean;
            }>[] | undefined;
            is_protected?: boolean | undefined;
            keep_monitoring_alive?: boolean | null | undefined;
            agentless?: Readonly<{
                resources?: Readonly<{
                    requests?: Readonly<{
                        memory?: string | undefined;
                        cpu?: string | undefined;
                    } & {}> | undefined;
                } & {}> | undefined;
                cloud_connectors?: Readonly<{
                    target_csp?: "azure" | "aws" | "gcp" | undefined;
                } & {
                    enabled: boolean;
                }> | undefined;
            } & {}> | undefined;
            monitoring_pprof_enabled?: boolean | undefined;
            monitoring_http?: Readonly<{
                port?: number | undefined;
                enabled?: boolean | undefined;
                host?: string | undefined;
                buffer?: Readonly<{} & {
                    enabled: boolean;
                }> | undefined;
            } & {}> | undefined;
            monitoring_diagnostics?: Readonly<{
                limit?: Readonly<{
                    interval?: string | undefined;
                    burst?: number | undefined;
                } & {}> | undefined;
                uploader?: Readonly<{
                    max_retries?: number | undefined;
                    init_dur?: string | undefined;
                    max_dur?: string | undefined;
                } & {}> | undefined;
            } & {}> | undefined;
            required_versions?: Readonly<{} & {
                version: string;
                percentage: number;
            }>[] | null | undefined;
            has_agent_version_conditions?: boolean | undefined;
            is_verifier?: boolean | undefined;
            package_policies?: (Readonly<{
                id?: string | number | undefined;
                namespace?: string | undefined;
                description?: string | undefined;
                inputs?: Readonly<{
                    streams?: Readonly<{
                        enabled?: boolean | undefined;
                        vars?: Readonly<{
                            type?: string | undefined;
                            value?: any;
                            frozen?: boolean | undefined;
                        } & {
                            name: string;
                        }>[] | undefined;
                        keep_enabled?: boolean | undefined;
                    } & {
                        data_stream: Readonly<{
                            type?: string | undefined;
                        } & {
                            dataset: string;
                        }>;
                    }>[] | undefined;
                    enabled?: boolean | undefined;
                    vars?: Readonly<{
                        type?: string | undefined;
                        value?: any;
                        frozen?: boolean | undefined;
                    } & {
                        name: string;
                    }>[] | undefined;
                    keep_enabled?: boolean | undefined;
                } & {
                    type: string;
                }>[] | undefined;
                output_id?: string | null | undefined;
            } & {
                name: string;
                package: Readonly<{} & {
                    name: string;
                }>;
            }> | Readonly<{
                namespace?: string | undefined;
                description?: string | undefined;
                condition?: string | undefined;
                vars?: Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
                    id: string;
                    isSecretRef: boolean;
                }> | null> | undefined;
                inputs?: Record<string, Readonly<{
                    streams?: Record<string, Readonly<{
                        enabled?: boolean | undefined;
                        deprecated?: Readonly<{
                            since?: string | undefined;
                            replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
                        } & {
                            description: string;
                        }> | undefined;
                        condition?: string | undefined;
                        vars?: Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
                            id: string;
                            isSecretRef: boolean;
                        }> | null> | undefined;
                        var_group_selections?: Record<string, string> | undefined;
                    } & {}>> | undefined;
                    enabled?: boolean | undefined;
                    deprecated?: Readonly<{
                        since?: string | undefined;
                        replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
                    } & {
                        description: string;
                    }> | undefined;
                    condition?: string | undefined;
                    vars?: Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
                        id: string;
                        isSecretRef: boolean;
                    }> | null> | undefined;
                } & {}>> | undefined;
                output_id?: string | null | undefined;
                var_group_selections?: Record<string, string> | undefined;
                supports_agentless?: boolean | null | undefined;
                additional_datastreams_permissions?: string[] | null | undefined;
            } & {
                name: string;
                id: string;
                package: Readonly<{} & {
                    name: string;
                }>;
            }>)[] | undefined;
        } & {
            name: string;
            inactivity_timeout: number;
        }>[] | undefined>;
        packages: import("@kbn/config-schema").Type<Readonly<{
            prerelease?: boolean | undefined;
            skipDataStreamRollover?: boolean | undefined;
        } & {
            name: string;
            version: string;
        }>[] | undefined>;
    }>;
};
export declare const PostResetOnePreconfiguredAgentPoliciesSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentPolicyId: import("@kbn/config-schema").Type<string>;
    }>;
};
