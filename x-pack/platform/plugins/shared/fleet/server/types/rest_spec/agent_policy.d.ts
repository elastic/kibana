export declare const GetAgentPoliciesRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number | undefined>;
        perPage: import("@kbn/config-schema").Type<number | undefined>;
        sortField: import("@kbn/config-schema").Type<string | undefined>;
        sortOrder: import("@kbn/config-schema").Type<"desc" | "asc" | undefined>;
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
        description?: string | undefined;
        version?: string | undefined;
        created_at?: string | undefined;
        overrides?: Record<string, any> | null | undefined;
        agents?: number | undefined;
        space_ids?: string[] | undefined;
        is_preconfigured?: boolean | undefined;
        is_default?: boolean | undefined;
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
        monitoring_pprof_enabled?: boolean | undefined;
        monitoring_http?: Readonly<{
            host?: string | undefined;
            port?: number | undefined;
            enabled?: boolean | undefined;
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
        }>[] | undefined;
        unprivileged_agents?: number | undefined;
        fips_agents?: number | undefined;
        agents_per_version?: Readonly<{} & {
            version: string;
            count: number;
        }>[] | undefined;
        min_agent_version?: string | null | undefined;
        package_agent_version_conditions?: Readonly<{} & {
            title: string;
            name: string;
            version_condition: string;
        }>[] | null | undefined;
    } & {
        status: "active" | "inactive";
        id: string;
        namespace: string;
        name: string;
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
            host?: string | undefined;
            port?: number | undefined;
            enabled?: boolean | undefined;
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
            title: string;
            name: string;
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
            host?: string | undefined;
            port?: number | undefined;
            enabled?: boolean | undefined;
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
            title: string;
            name: string;
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
            description?: string | undefined;
            enabled?: boolean | undefined;
            force?: boolean | undefined;
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
            } & {}>> | undefined;
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
            name: string;
            inputs: Readonly<{
                id?: string | undefined;
                name?: string | undefined;
                deprecated?: Readonly<{
                    since?: string | undefined;
                    replaced_by?: Record<"package" | "input" | "variable" | "dataStream" | "policyTemplate", string> | undefined;
                } & {
                    description: string;
                }> | undefined;
                streams?: Readonly<{
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
                }>[] | undefined;
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
            } & {}>> | undefined;
            var_group_selections?: Record<string, string> | undefined;
            policy_ids?: string[] | undefined;
            output_id?: string | null | undefined;
            supports_agentless?: boolean | null | undefined;
            additional_datastreams_permissions?: string[] | null | undefined;
        } & {
            package: Readonly<{
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
            }>;
            name: string;
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
            host?: string | undefined;
            port?: number | undefined;
            enabled?: boolean | undefined;
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
            title: string;
            name: string;
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
        agent?: Readonly<{
            internal?: any;
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
            limits?: Readonly<{
                go_max_procs?: number | undefined;
            } & {}> | undefined;
            protection?: Readonly<{} & {
                enabled: boolean;
                uninstall_token_hash: string;
                signing_key: string;
            }> | undefined;
        } & {
            download: Readonly<{
                auth?: Readonly<{
                    headers?: Readonly<{} & {
                        key: string;
                        value: string;
                    }>[] | undefined;
                    username?: string | undefined;
                    api_key?: string | undefined;
                    password?: string | undefined;
                } & {}> | undefined;
                timeout?: string | undefined;
                ssl?: Readonly<{
                    key?: string | undefined;
                    certificate?: string | undefined;
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
                target_directory?: string | undefined;
            } & {
                sourceURI: string;
            }>;
            features: Record<string, Readonly<{} & {
                enabled: boolean;
            }>>;
            monitoring: Readonly<{
                namespace?: string | undefined;
                http?: Readonly<{
                    host?: string | undefined;
                    port?: number | undefined;
                    enabled?: boolean | undefined;
                } & {}> | undefined;
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
        }> | undefined;
        namespaces?: string[] | undefined;
        fleet?: Readonly<{
            ssl?: Readonly<{
                key?: string | undefined;
                certificate?: string | undefined;
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
                protocol: string;
                hosts: string[];
            }>;
        }> | undefined;
        connectors?: Record<string, any> | undefined;
        processors?: Record<string, any> | undefined;
        extensions?: Record<string, any> | undefined;
        service?: Readonly<{
            pipelines?: Record<string, Readonly<{
                processors?: string[] | undefined;
                receivers?: string[] | undefined;
                exporters?: string[] | undefined;
            } & {}> | undefined> | undefined;
            extensions?: string[] | undefined;
        } & {}> | undefined;
        revision?: number | undefined;
        signed?: Readonly<{} & {
            data: string;
            signature: string;
        }> | undefined;
        secret_references?: Readonly<{} & {
            id: string;
        }>[] | undefined;
        output_permissions?: Record<string, Record<string, any>> | undefined;
        receivers?: Record<string, any> | undefined;
        exporters?: Record<string, any> | undefined;
    } & {
        id: string;
        inputs: Readonly<{
            meta?: Readonly<{
                package?: Readonly<{} & {
                    name: string;
                    version: string;
                }> | undefined;
            } & {}> | undefined;
            streams?: Readonly<{} & {
                id: string;
                data_stream: Readonly<{
                    type?: string | undefined;
                } & {
                    dataset: string;
                }>;
            }>[] | undefined;
            processors?: Readonly<{} & {
                add_fields: Readonly<{} & {
                    target: string;
                    fields: Record<string, string | number>;
                }>;
            }>[] | undefined;
        } & {
            type: string;
            id: string;
            name: string;
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
