export declare const GetAgentPoliciesRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number | undefined>;
        perPage: import("@kbn/config-schema").Type<number | undefined>;
        sortField: import("@kbn/config-schema").Type<string | undefined>;
        sortOrder: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
        showUpgradeable: import("@kbn/config-schema").Type<boolean | undefined>;
        kuery: import("@kbn/config-schema").Type<string | undefined>;
        noAgentCount: import("@kbn/config-schema").Type<boolean | undefined>;
        withAgentCount: import("@kbn/config-schema").Type<boolean | undefined>;
        full: import("@kbn/config-schema").Type<boolean | undefined>;
        format: import("@kbn/config-schema").Type<"legacy" | "simplified" | undefined>;
    }>;
};
export declare const BulkGetAgentPoliciesRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<Omit<{
        ids: import("@kbn/config-schema").Type<string[]>;
        ignoreMissing: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "full"> & {
        full: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        format: import("@kbn/config-schema").Type<"legacy" | "simplified" | undefined>;
    }>;
};
export declare const BulkGetAgentPoliciesResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        version?: string | undefined;
        description?: string | undefined;
        agents?: number | undefined;
        overrides?: Record<string, any> | null | undefined;
        created_at?: string | undefined;
        space_ids?: string[] | undefined;
        is_preconfigured?: boolean | undefined;
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
        data_output_id?: string | null | undefined;
        monitoring_output_id?: string | null | undefined;
        download_source_id?: string | null | undefined;
        fleet_server_host_id?: string | null | undefined;
        schema_version?: string | undefined;
        agent_features?: Readonly<{} & {
            name: string;
            enabled: boolean;
        }>[] | undefined;
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
            cluster_id?: string | undefined;
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
        package_policies?: string[] | Readonly<{
            version?: string | undefined;
            namespace?: string | undefined;
            description?: string | undefined;
            package?: Readonly<{
                title?: string | undefined;
                experimental_data_stream_features?: Readonly<{} & {
                    data_stream: string;
                    features: Readonly<{
                        synthetic_source?: boolean | undefined;
                        tsdb?: boolean | undefined;
                        doc_value_only_numeric?: boolean | undefined;
                        doc_value_only_other?: boolean | undefined;
                    } & {}>;
                }>[] | undefined;
                requires_root?: boolean | undefined;
                fips_compatible?: boolean | undefined;
            } & {
                name: string;
                version: string;
            }> | undefined;
            elasticsearch?: Readonly<{
                privileges?: Readonly<{
                    cluster?: string[] | undefined;
                } & {}> | undefined;
            } & {}> | undefined;
            agents?: number | undefined;
            overrides?: Readonly<{
                inputs?: Record<string, any> | undefined;
            } & {}> | null | undefined;
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
            } & {}>> | Readonly<{
                config?: Record<string, Readonly<{
                    type?: string | undefined;
                    value?: any;
                    frozen?: boolean | undefined;
                } & {}>> | undefined;
                name?: string | undefined;
                id?: string | undefined;
                deprecated?: Readonly<{
                    since?: string | undefined;
                    replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
                } & {
                    description: string;
                }> | undefined;
                condition?: string | undefined;
                vars?: Record<string, Readonly<{
                    type?: string | undefined;
                    value?: any;
                    frozen?: boolean | undefined;
                } & {}>> | undefined;
                var_group_selections?: Record<string, string> | undefined;
                policy_template?: string | undefined;
                keep_enabled?: boolean | undefined;
                migrate_from?: string | undefined;
                compiled_input?: any;
            } & {
                streams: Readonly<{
                    config?: Record<string, Readonly<{
                        type?: string | undefined;
                        value?: any;
                        frozen?: boolean | undefined;
                    } & {}>> | undefined;
                    id?: string | undefined;
                    deprecated?: Readonly<{
                        since?: string | undefined;
                        replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
                    } & {
                        description: string;
                    }> | undefined;
                    condition?: string | undefined;
                    vars?: Record<string, Readonly<{
                        type?: string | undefined;
                        value?: any;
                        frozen?: boolean | undefined;
                    } & {}>> | undefined;
                    release?: "experimental" | "beta" | "ga" | undefined;
                    var_group_selections?: Record<string, string> | undefined;
                    keep_enabled?: boolean | undefined;
                    migrate_from?: string | undefined;
                    compiled_stream?: any;
                } & {
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
                    enabled: boolean;
                }>[];
                type: string;
                enabled: boolean;
            }>[] | undefined;
            is_managed?: boolean | undefined;
            policy_ids?: string[] | undefined;
            output_id?: string | null | undefined;
            cloud_connector_id?: string | null | undefined;
            cloud_connector_name?: string | null | undefined;
            var_group_selections?: Record<string, string> | undefined;
            supports_agentless?: boolean | null | undefined;
            supports_cloud_connector?: boolean | null | undefined;
            additional_datastreams_permissions?: string[] | null | undefined;
            global_data_tags?: Readonly<{} & {
                name: string;
                value: string | number;
            }>[] | null | undefined;
            secret_references?: Readonly<{} & {
                id: string;
            }>[] | undefined;
            package_agent_version_condition?: string | undefined;
        } & {
            name: string;
            id: string;
            enabled: boolean;
            updated_at: string;
            updated_by: string;
            created_at: string;
            created_by: string;
            revision: number;
        }>[] | undefined;
        unprivileged_agents?: number | undefined;
        fips_agents?: number | undefined;
        agents_per_version?: Readonly<{} & {
            count: number;
            version: string;
        }>[] | undefined;
        min_agent_version?: string | null | undefined;
        package_agent_version_conditions?: Readonly<{} & {
            name: string;
            title: string;
            version_condition: string;
        }>[] | null | undefined;
    } & {
        name: string;
        id: string;
        status: "active" | "inactive";
        namespace: string;
        updated_at: string;
        updated_by: string;
        revision: number;
        inactivity_timeout: number;
        is_protected: boolean;
    }>[]>;
}>;
export declare const GetOneAgentPolicyRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentPolicyId: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        format: import("@kbn/config-schema").Type<"legacy" | "simplified" | undefined>;
    }>;
};
export declare const GetAutoUpgradeAgentsStatusRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentPolicyId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const CreateAgentPolicyRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<Omit<{
        supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
        global_data_tags: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            value: string | number;
        }>[] | undefined>;
        agentless: import("@kbn/config-schema").Type<Readonly<{
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
        } & {}> | undefined>;
        monitoring_pprof_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
        monitoring_http: import("@kbn/config-schema").Type<Readonly<{
            port?: number | undefined;
            enabled?: boolean | undefined;
            host?: string | undefined;
            buffer?: Readonly<{} & {
                enabled: boolean;
            }> | undefined;
        } & {}> | undefined>;
        monitoring_diagnostics: import("@kbn/config-schema").Type<Readonly<{
            limit?: Readonly<{
                interval?: string | undefined;
                burst?: number | undefined;
            } & {}> | undefined;
            uploader?: Readonly<{
                max_retries?: number | undefined;
                init_dur?: string | undefined;
                max_dur?: string | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
        required_versions: import("@kbn/config-schema").Type<Readonly<{} & {
            version: string;
            percentage: number;
        }>[] | null | undefined>;
        is_verifier: import("@kbn/config-schema").Type<boolean | undefined>;
        id: import("@kbn/config-schema").Type<string | undefined>;
        space_ids: import("@kbn/config-schema").Type<string[] | undefined>;
        name: import("@kbn/config-schema").Type<string>;
        namespace: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        is_managed: import("@kbn/config-schema").Type<boolean | undefined>;
        has_fleet_server: import("@kbn/config-schema").Type<boolean | undefined>;
        is_default: import("@kbn/config-schema").Type<boolean | undefined>;
        is_default_fleet_server: import("@kbn/config-schema").Type<boolean | undefined>;
        unenroll_timeout: import("@kbn/config-schema").Type<number | undefined>;
        inactivity_timeout: import("@kbn/config-schema").Type<number>;
        monitoring_enabled: import("@kbn/config-schema").Type<("metrics" | "logs" | "traces")[] | undefined>;
        keep_monitoring_alive: import("@kbn/config-schema").Type<boolean | null | undefined>;
        data_output_id: import("@kbn/config-schema").Type<string | null | undefined>;
        monitoring_output_id: import("@kbn/config-schema").Type<string | null | undefined>;
        download_source_id: import("@kbn/config-schema").Type<string | null | undefined>;
        fleet_server_host_id: import("@kbn/config-schema").Type<string | null | undefined>;
        agent_features: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            enabled: boolean;
        }>[] | undefined>;
        is_protected: import("@kbn/config-schema").Type<boolean | undefined>;
        overrides: import("@kbn/config-schema").Type<Record<string, any> | null | undefined>;
    }, "has_agent_version_conditions"> & {
        has_agent_version_conditions: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "min_agent_version" | "package_agent_version_conditions"> & {
        min_agent_version: import("@kbn/config-schema").Type<string | null | undefined>;
        package_agent_version_conditions: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            title: string;
            version_condition: string;
        }>[] | null | undefined>;
    }, "is_verifier"> & {
        is_verifier: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "agentless"> & {
        agentless: import("@kbn/config-schema").Type<Readonly<{
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
            cluster_id?: string | undefined;
        } & {}> | undefined>;
    }, "force" | "supports_agentless"> & {
        force: import("@kbn/config-schema").Type<boolean | undefined>;
        supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        sys_monitoring: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const CreateAgentAndPackagePolicyRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<Omit<Omit<{
        supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
        global_data_tags: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            value: string | number;
        }>[] | undefined>;
        agentless: import("@kbn/config-schema").Type<Readonly<{
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
        } & {}> | undefined>;
        monitoring_pprof_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
        monitoring_http: import("@kbn/config-schema").Type<Readonly<{
            port?: number | undefined;
            enabled?: boolean | undefined;
            host?: string | undefined;
            buffer?: Readonly<{} & {
                enabled: boolean;
            }> | undefined;
        } & {}> | undefined>;
        monitoring_diagnostics: import("@kbn/config-schema").Type<Readonly<{
            limit?: Readonly<{
                interval?: string | undefined;
                burst?: number | undefined;
            } & {}> | undefined;
            uploader?: Readonly<{
                max_retries?: number | undefined;
                init_dur?: string | undefined;
                max_dur?: string | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
        required_versions: import("@kbn/config-schema").Type<Readonly<{} & {
            version: string;
            percentage: number;
        }>[] | null | undefined>;
        is_verifier: import("@kbn/config-schema").Type<boolean | undefined>;
        id: import("@kbn/config-schema").Type<string | undefined>;
        space_ids: import("@kbn/config-schema").Type<string[] | undefined>;
        name: import("@kbn/config-schema").Type<string>;
        namespace: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        is_managed: import("@kbn/config-schema").Type<boolean | undefined>;
        has_fleet_server: import("@kbn/config-schema").Type<boolean | undefined>;
        is_default: import("@kbn/config-schema").Type<boolean | undefined>;
        is_default_fleet_server: import("@kbn/config-schema").Type<boolean | undefined>;
        unenroll_timeout: import("@kbn/config-schema").Type<number | undefined>;
        inactivity_timeout: import("@kbn/config-schema").Type<number>;
        monitoring_enabled: import("@kbn/config-schema").Type<("metrics" | "logs" | "traces")[] | undefined>;
        keep_monitoring_alive: import("@kbn/config-schema").Type<boolean | null | undefined>;
        data_output_id: import("@kbn/config-schema").Type<string | null | undefined>;
        monitoring_output_id: import("@kbn/config-schema").Type<string | null | undefined>;
        download_source_id: import("@kbn/config-schema").Type<string | null | undefined>;
        fleet_server_host_id: import("@kbn/config-schema").Type<string | null | undefined>;
        agent_features: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            enabled: boolean;
        }>[] | undefined>;
        is_protected: import("@kbn/config-schema").Type<boolean | undefined>;
        overrides: import("@kbn/config-schema").Type<Record<string, any> | null | undefined>;
    }, "has_agent_version_conditions"> & {
        has_agent_version_conditions: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "min_agent_version" | "package_agent_version_conditions"> & {
        min_agent_version: import("@kbn/config-schema").Type<string | null | undefined>;
        package_agent_version_conditions: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            title: string;
            version_condition: string;
        }>[] | null | undefined>;
    }, "is_verifier"> & {
        is_verifier: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "agentless"> & {
        agentless: import("@kbn/config-schema").Type<Readonly<{
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
            cluster_id?: string | undefined;
        } & {}> | undefined>;
    }, "force" | "supports_agentless"> & {
        force: import("@kbn/config-schema").Type<boolean | undefined>;
        supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
    }, "package_policies"> & {
        package_policies: import("@kbn/config-schema").Type<(Readonly<{
            id?: string | undefined;
            namespace?: string | undefined;
            enabled?: boolean | undefined;
            description?: string | undefined;
            package?: Readonly<{
                title?: string | undefined;
                experimental_data_stream_features?: Readonly<{} & {
                    data_stream: string;
                    features: Readonly<{
                        synthetic_source?: boolean | undefined;
                        tsdb?: boolean | undefined;
                        doc_value_only_numeric?: boolean | undefined;
                        doc_value_only_other?: boolean | undefined;
                    } & {}>;
                }>[] | undefined;
                requires_root?: boolean | undefined;
                fips_compatible?: boolean | undefined;
            } & {
                name: string;
                version: string;
            }> | undefined;
            overrides?: Readonly<{
                inputs?: Record<string, any> | undefined;
            } & {}> | null | undefined;
            force?: boolean | undefined;
            condition?: string | undefined;
            policy_id?: string | null | undefined;
            spaceIds?: string[] | undefined;
            vars?: Record<string, Readonly<{
                type?: string | undefined;
                value?: any;
                frozen?: boolean | undefined;
            } & {}>> | undefined;
            is_managed?: boolean | undefined;
            policy_ids?: string[] | undefined;
            output_id?: string | null | undefined;
            cloud_connector_id?: string | null | undefined;
            cloud_connector_name?: string | null | undefined;
            var_group_selections?: Record<string, string> | undefined;
            supports_agentless?: boolean | null | undefined;
            supports_cloud_connector?: boolean | null | undefined;
            additional_datastreams_permissions?: string[] | null | undefined;
            global_data_tags?: Readonly<{} & {
                name: string;
                value: string | number;
            }>[] | null | undefined;
            package_agent_version_condition?: string | undefined;
        } & {
            name: string;
            inputs: Readonly<{
                config?: Record<string, Readonly<{
                    type?: string | undefined;
                    value?: any;
                    frozen?: boolean | undefined;
                } & {}>> | undefined;
                streams?: Readonly<{
                    config?: Record<string, Readonly<{
                        type?: string | undefined;
                        value?: any;
                        frozen?: boolean | undefined;
                    } & {}>> | undefined;
                    id?: string | undefined;
                    deprecated?: Readonly<{
                        since?: string | undefined;
                        replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
                    } & {
                        description: string;
                    }> | undefined;
                    condition?: string | undefined;
                    vars?: Record<string, Readonly<{
                        type?: string | undefined;
                        value?: any;
                        frozen?: boolean | undefined;
                    } & {}>> | undefined;
                    release?: "experimental" | "beta" | "ga" | undefined;
                    var_group_selections?: Record<string, string> | undefined;
                    keep_enabled?: boolean | undefined;
                    migrate_from?: string | undefined;
                    compiled_stream?: any;
                } & {
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
                    enabled: boolean;
                }>[] | undefined;
                name?: string | undefined;
                id?: string | undefined;
                deprecated?: Readonly<{
                    since?: string | undefined;
                    replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
                } & {
                    description: string;
                }> | undefined;
                condition?: string | undefined;
                vars?: Record<string, Readonly<{
                    type?: string | undefined;
                    value?: any;
                    frozen?: boolean | undefined;
                } & {}>> | undefined;
                var_group_selections?: Record<string, string> | undefined;
                policy_template?: string | undefined;
                keep_enabled?: boolean | undefined;
                migrate_from?: string | undefined;
            } & {
                type: string;
                enabled: boolean;
            }>[];
        }> | Readonly<{
            id?: string | undefined;
            namespace?: string | undefined;
            description?: string | undefined;
            force?: boolean | undefined;
            condition?: string | undefined;
            policy_id?: string | null | undefined;
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
            policy_ids?: string[] | undefined;
            output_id?: string | null | undefined;
            var_group_selections?: Record<string, string> | undefined;
            supports_agentless?: boolean | null | undefined;
            additional_datastreams_permissions?: string[] | null | undefined;
        } & {
            name: string;
            package: Readonly<{
                title?: string | undefined;
                experimental_data_stream_features?: Readonly<{} & {
                    data_stream: string;
                    features: Readonly<{
                        synthetic_source?: boolean | undefined;
                        tsdb?: boolean | undefined;
                        doc_value_only_numeric?: boolean | undefined;
                        doc_value_only_other?: boolean | undefined;
                    } & {}>;
                }>[] | undefined;
                requires_root?: boolean | undefined;
                fips_compatible?: boolean | undefined;
            } & {
                name: string;
                version: string;
            }>;
        }>)[]>;
    }>;
    query: import("@kbn/config-schema").Type<Readonly<{
        format?: "legacy" | "simplified" | undefined;
        sys_monitoring?: boolean | undefined;
    } & {}>>;
};
export declare const UpdateAgentPolicyRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<Omit<Omit<{
        supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
        global_data_tags: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            value: string | number;
        }>[] | undefined>;
        agentless: import("@kbn/config-schema").Type<Readonly<{
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
        } & {}> | undefined>;
        monitoring_pprof_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
        monitoring_http: import("@kbn/config-schema").Type<Readonly<{
            port?: number | undefined;
            enabled?: boolean | undefined;
            host?: string | undefined;
            buffer?: Readonly<{} & {
                enabled: boolean;
            }> | undefined;
        } & {}> | undefined>;
        monitoring_diagnostics: import("@kbn/config-schema").Type<Readonly<{
            limit?: Readonly<{
                interval?: string | undefined;
                burst?: number | undefined;
            } & {}> | undefined;
            uploader?: Readonly<{
                max_retries?: number | undefined;
                init_dur?: string | undefined;
                max_dur?: string | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
        required_versions: import("@kbn/config-schema").Type<Readonly<{} & {
            version: string;
            percentage: number;
        }>[] | null | undefined>;
        is_verifier: import("@kbn/config-schema").Type<boolean | undefined>;
        id: import("@kbn/config-schema").Type<string | undefined>;
        space_ids: import("@kbn/config-schema").Type<string[] | undefined>;
        name: import("@kbn/config-schema").Type<string>;
        namespace: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        is_managed: import("@kbn/config-schema").Type<boolean | undefined>;
        has_fleet_server: import("@kbn/config-schema").Type<boolean | undefined>;
        is_default: import("@kbn/config-schema").Type<boolean | undefined>;
        is_default_fleet_server: import("@kbn/config-schema").Type<boolean | undefined>;
        unenroll_timeout: import("@kbn/config-schema").Type<number | undefined>;
        inactivity_timeout: import("@kbn/config-schema").Type<number>;
        monitoring_enabled: import("@kbn/config-schema").Type<("metrics" | "logs" | "traces")[] | undefined>;
        keep_monitoring_alive: import("@kbn/config-schema").Type<boolean | null | undefined>;
        data_output_id: import("@kbn/config-schema").Type<string | null | undefined>;
        monitoring_output_id: import("@kbn/config-schema").Type<string | null | undefined>;
        download_source_id: import("@kbn/config-schema").Type<string | null | undefined>;
        fleet_server_host_id: import("@kbn/config-schema").Type<string | null | undefined>;
        agent_features: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            enabled: boolean;
        }>[] | undefined>;
        is_protected: import("@kbn/config-schema").Type<boolean | undefined>;
        overrides: import("@kbn/config-schema").Type<Record<string, any> | null | undefined>;
    }, "has_agent_version_conditions"> & {
        has_agent_version_conditions: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "min_agent_version" | "package_agent_version_conditions"> & {
        min_agent_version: import("@kbn/config-schema").Type<string | null | undefined>;
        package_agent_version_conditions: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            title: string;
            version_condition: string;
        }>[] | null | undefined>;
    }, "is_verifier"> & {
        is_verifier: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "agentless"> & {
        agentless: import("@kbn/config-schema").Type<Readonly<{
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
            cluster_id?: string | undefined;
        } & {}> | undefined>;
    }, "force" | "supports_agentless"> & {
        force: import("@kbn/config-schema").Type<boolean | undefined>;
        supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
    }, "force" | "bumpRevision"> & {
        force: import("@kbn/config-schema").Type<boolean | undefined>;
        bumpRevision: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    params: import("@kbn/config-schema").ObjectType<{
        agentPolicyId: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        format: import("@kbn/config-schema").Type<"legacy" | "simplified" | undefined>;
    }>;
};
export declare const CopyAgentPolicyRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    params: import("@kbn/config-schema").ObjectType<{
        agentPolicyId: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        format: import("@kbn/config-schema").Type<"legacy" | "simplified" | undefined>;
    }>;
};
export declare const DeleteAgentPolicyRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agentPolicyId: import("@kbn/config-schema").Type<string>;
        force: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const DeleteAgentPolicyResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
}>;
export declare const GetFullAgentPolicyRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentPolicyId: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        download: import("@kbn/config-schema").Type<boolean | undefined>;
        standalone: import("@kbn/config-schema").Type<boolean | undefined>;
        kubernetes: import("@kbn/config-schema").Type<boolean | undefined>;
        revision: import("@kbn/config-schema").Type<number | undefined>;
    }>;
};
export declare const GetFullAgentPolicyResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").Type<string | Readonly<{
        fleet?: Readonly<{
            ssl?: Readonly<{
                certificate?: string | undefined;
                key?: string | undefined;
                certificate_authorities?: string[] | undefined;
                verification_mode?: string | undefined;
                renegotiation?: string | undefined;
            } & {}> | undefined;
            secrets?: Readonly<{
                ssl?: Readonly<{} & {
                    key: Readonly<{
                        id?: string | undefined;
                    } & {}>;
                }> | undefined;
            } & {}> | undefined;
            proxy_url?: string | undefined;
            proxy_headers?: Record<string, string | number | boolean> | null | undefined;
        } & {
            hosts: string[];
        }> | Readonly<{} & {
            kibana: Readonly<{
                path?: string | undefined;
            } & {
                hosts: string[];
                protocol: string;
            }>;
        }> | undefined;
        agent?: Readonly<{
            logging?: Readonly<{
                metrics?: Readonly<{
                    period?: string | undefined;
                } & {}> | undefined;
                level?: string | undefined;
                files?: Readonly<{
                    interval?: string | undefined;
                    rotateeverybytes?: number | undefined;
                    keepfiles?: number | undefined;
                } & {}> | undefined;
                to_files?: boolean | undefined;
            } & {}> | undefined;
            internal?: any;
            limits?: Readonly<{
                go_max_procs?: number | undefined;
            } & {}> | undefined;
            protection?: Readonly<{} & {
                enabled: boolean;
                uninstall_token_hash: string;
                signing_key: string;
            }> | undefined;
        } & {
            features: Record<string, Readonly<{} & {
                enabled: boolean;
            }>>;
            monitoring: Readonly<{
                http?: Readonly<{
                    port?: number | undefined;
                    enabled?: boolean | undefined;
                    host?: string | undefined;
                } & {}> | undefined;
                namespace?: string | undefined;
                apm?: any;
                use_output?: string | undefined;
                _runtime_experimental?: string | undefined;
                pprof?: Readonly<{} & {
                    enabled: boolean;
                }> | undefined;
                diagnostics?: Readonly<{
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
            } & {
                enabled: boolean;
                metrics: boolean;
                logs: boolean;
                traces: boolean;
            }>;
            download: Readonly<{
                auth?: Readonly<{
                    headers?: Readonly<{} & {
                        key: string;
                        value: string;
                    }>[] | undefined;
                    api_key?: string | undefined;
                    password?: string | undefined;
                    username?: string | undefined;
                } & {}> | undefined;
                ssl?: Readonly<{
                    certificate?: string | undefined;
                    key?: string | undefined;
                    certificate_authorities?: string[] | undefined;
                    verification_mode?: string | undefined;
                    renegotiation?: string | undefined;
                } & {}> | undefined;
                timeout?: string | undefined;
                secrets?: Readonly<{
                    ssl?: Readonly<{} & {
                        key: Readonly<{
                            id?: string | undefined;
                        } & {}>;
                    }> | undefined;
                } & {}> | undefined;
                proxy_url?: string | undefined;
                proxy_headers?: Record<string, string | number | boolean> | null | undefined;
                target_directory?: string | undefined;
            } & {
                sourceURI: string;
            }>;
        }> | undefined;
        service?: Readonly<{
            pipelines?: Record<string, Readonly<{
                exporters?: string[] | undefined;
                processors?: string[] | undefined;
                receivers?: string[] | undefined;
            } & {}> | undefined> | undefined;
            extensions?: string[] | undefined;
        } & {}> | undefined;
        exporters?: Record<string, any> | undefined;
        processors?: Record<string, any> | undefined;
        connectors?: Record<string, any> | undefined;
        namespaces?: string[] | undefined;
        extensions?: Record<string, any> | undefined;
        revision?: number | undefined;
        output_permissions?: Record<string, Record<string, any>> | undefined;
        signed?: Readonly<{} & {
            data: string;
            signature: string;
        }> | undefined;
        secret_references?: Readonly<{} & {
            id: string;
        }>[] | undefined;
        receivers?: Record<string, any> | undefined;
    } & {
        id: string;
        inputs: Readonly<{
            streams?: Readonly<{} & {
                id: string;
                data_stream: Readonly<{
                    type?: string | undefined;
                } & {
                    dataset: string;
                }>;
            }>[] | undefined;
            meta?: Readonly<{
                package?: Readonly<{} & {
                    name: string;
                    version: string;
                }> | undefined;
            } & {}> | undefined;
            processors?: Readonly<{} & {
                add_fields: Readonly<{} & {
                    fields: Record<string, string | number>;
                    target: string;
                }>;
            }>[] | undefined;
        } & {
            name: string;
            id: string;
            type: string;
            data_stream: Readonly<{} & {
                namespace: string;
            }>;
            revision: number;
            use_output: string;
            package_policy_id: string;
        }>[];
        outputs: Record<string, Readonly<{
            hosts?: string[] | undefined;
            ca_sha256?: string | null | undefined;
            proxy_url?: string | undefined;
            proxy_headers?: Record<string, string | number | boolean> | null | undefined;
        } & {
            type: string;
        }>>;
    }>>;
}>;
export declare const DownloadFullAgentPolicyResponseSchema: import("@kbn/config-schema").Type<string>;
export declare const GetK8sManifestRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        download: import("@kbn/config-schema").Type<boolean | undefined>;
        fleetServer: import("@kbn/config-schema").Type<string | undefined>;
        enrolToken: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export declare const GetK8sManifestResponseScheme: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").Type<string>;
}>;
export declare const GetAgentPolicyOutputsRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentPolicyId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const GetListAgentPolicyOutputsRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        ids: import("@kbn/config-schema").Type<string[]>;
    }>;
};
export declare const RunAgentPolicyRevisionsCleanupTaskRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        maxRevisions: import("@kbn/config-schema").Type<number | undefined>;
        maxPolicies: import("@kbn/config-schema").Type<number | undefined>;
    }>;
};
export declare const RunAgentPolicyRevisionsCleanupTaskResponseSchema: import("@kbn/config-schema").ObjectType<{
    success: import("@kbn/config-schema").Type<boolean>;
    totalDeletedRevisions: import("@kbn/config-schema").Type<number>;
}>;
