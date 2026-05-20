export declare const GetPackagePoliciesRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number | undefined>;
        perPage: import("@kbn/config-schema").Type<number | undefined>;
        sortField: import("@kbn/config-schema").Type<string | undefined>;
        sortOrder: import("@kbn/config-schema").Type<"desc" | "asc" | undefined>;
        showUpgradeable: import("@kbn/config-schema").Type<boolean | undefined>;
        kuery: import("@kbn/config-schema").Type<string | undefined>;
        format: import("@kbn/config-schema").Type<"legacy" | "simplified" | undefined>;
        withAgentCount: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const BulkGetPackagePoliciesRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        ids: import("@kbn/config-schema").Type<string[]>;
        ignoreMissing: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        format: import("@kbn/config-schema").Type<"legacy" | "simplified" | undefined>;
    }>;
};
export declare const BulkGetPackagePoliciesResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
}>;
export declare const GetOnePackagePolicyRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        packagePolicyId: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        format: import("@kbn/config-schema").Type<"legacy" | "simplified" | undefined>;
    }>;
};
export declare const CreatePackagePolicyRequestSchema: {
    body: import("@kbn/config-schema").Type<Readonly<{
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
    }>>;
    query: import("@kbn/config-schema").ObjectType<{
        format: import("@kbn/config-schema").Type<"legacy" | "simplified" | undefined>;
    }>;
};
export declare const CreatePackagePolicyResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<Omit<{
        id: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        revision: import("@kbn/config-schema").Type<number>;
        updated_at: import("@kbn/config-schema").Type<string>;
        updated_by: import("@kbn/config-schema").Type<string>;
        created_at: import("@kbn/config-schema").Type<string>;
        created_by: import("@kbn/config-schema").Type<string>;
        elasticsearch: import("@kbn/config-schema").Type<Readonly<{
            privileges?: Readonly<{
                cluster?: string[] | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
        inputs: import("@kbn/config-schema").Type<Readonly<{
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
        }>[]>;
        secret_references: import("@kbn/config-schema").Type<Readonly<{} & {
            id: string;
        }>[] | undefined>;
        name: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        namespace: import("@kbn/config-schema").Type<string | undefined>;
        policy_id: import("@kbn/config-schema").Type<string | null | undefined>;
        policy_ids: import("@kbn/config-schema").Type<string[] | undefined>;
        output_id: import("@kbn/config-schema").Type<string | null | undefined>;
        cloud_connector_id: import("@kbn/config-schema").Type<string | null | undefined>;
        cloud_connector_name: import("@kbn/config-schema").Type<string | null | undefined>;
        enabled: import("@kbn/config-schema").Type<boolean>;
        is_managed: import("@kbn/config-schema").Type<boolean | undefined>;
        package: import("@kbn/config-schema").Type<Readonly<{
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
        }> | undefined>;
        vars: import("@kbn/config-schema").Type<Record<string, Readonly<{
            type?: string | undefined;
            value?: any;
            frozen?: boolean | undefined;
        } & {}>> | undefined>;
        var_group_selections: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
        overrides: import("@kbn/config-schema").Type<Readonly<{
            inputs?: Record<string, any> | undefined;
        } & {}> | null | undefined>;
        supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
        supports_cloud_connector: import("@kbn/config-schema").Type<boolean | null | undefined>;
        additional_datastreams_permissions: import("@kbn/config-schema").Type<string[] | null | undefined>;
        package_agent_version_condition: import("@kbn/config-schema").Type<string | undefined>;
        condition: import("@kbn/config-schema").Type<string | undefined>;
        global_data_tags: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            value: string | number;
        }>[] | null | undefined>;
    }, "agents" | "spaceIds" | "vars" | "inputs"> & {
        agents: import("@kbn/config-schema").Type<number | undefined>;
        spaceIds: import("@kbn/config-schema").Type<string[] | undefined>;
        vars: import("@kbn/config-schema").Type<Record<string, Readonly<{
            type?: string | undefined;
            value?: any;
            frozen?: boolean | undefined;
        } & {}>> | Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
            id: string;
            isSecretRef: boolean;
        }> | null> | undefined>;
        inputs: import("@kbn/config-schema").Type<Record<string, Readonly<{
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
        }>[] | undefined>;
    }>;
}>;
export declare const UpdatePackagePolicyRequestSchema: {
    body: import("@kbn/config-schema").Type<Readonly<{
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
    }> | Readonly<{
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
        name?: string | undefined;
        version?: string | undefined;
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
        inputs?: Readonly<{
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
    } & {}>>;
    query: import("@kbn/config-schema").ObjectType<{
        format: import("@kbn/config-schema").Type<"legacy" | "simplified" | undefined>;
    }>;
    params: import("@kbn/config-schema").ObjectType<{
        packagePolicyId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const DeletePackagePoliciesRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        packagePolicyIds: import("@kbn/config-schema").Type<string[]>;
        force: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const DeletePackagePoliciesResponseBodySchema: import("@kbn/config-schema").Type<Readonly<{
    body?: Readonly<{} & {
        message: string;
    }> | undefined;
    name?: string | undefined;
    statusCode?: number | undefined;
    policy_id?: string | null | undefined;
    output_id?: string | null | undefined;
} & {
    id: string;
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
    success: boolean;
    policy_ids: string[];
}>[]>;
export declare const DeleteOnePackagePolicyRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        packagePolicyId: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        force: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const DeleteOnePackagePolicyResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const UpgradePackagePoliciesRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        packagePolicyIds: import("@kbn/config-schema").Type<string[]>;
    }>;
};
export declare const UpgradePackagePoliciesResponseBodySchema: import("@kbn/config-schema").Type<Readonly<{
    body?: Readonly<{} & {
        message: string;
    }> | undefined;
    name?: string | undefined;
    statusCode?: number | undefined;
} & {
    id: string;
    success: boolean;
}>[]>;
export declare const DryRunPackagePoliciesRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        packagePolicyIds: import("@kbn/config-schema").Type<string[]>;
        packageVersion: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export declare const DryRunPackagePoliciesResponseBodySchema: import("@kbn/config-schema").Type<Readonly<{
    diff?: (Readonly<{
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
        elasticsearch?: Readonly<{
            privileges?: Readonly<{
                cluster?: string[] | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        description?: string | undefined;
        version?: string | undefined;
        updated_at?: string | undefined;
        updated_by?: string | undefined;
        created_at?: string | undefined;
        created_by?: string | undefined;
        force?: boolean | undefined;
        overrides?: Readonly<{
            inputs?: Record<string, any> | undefined;
        } & {}> | null | undefined;
        errors?: Readonly<{
            key?: string | undefined;
        } & {
            message: string;
        }>[] | undefined;
        condition?: string | undefined;
        revision?: number | undefined;
        policy_id?: string | null | undefined;
        vars?: Record<string, Readonly<{
            type?: string | undefined;
            value?: any;
            frozen?: boolean | undefined;
        } & {}>> | undefined;
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
        missingVars?: string[] | undefined;
    } & {
        name: string;
        enabled: boolean;
        inputs: Readonly<{
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
        }>[];
    }> | Readonly<{
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
        name: string;
        enabled: boolean;
        updated_at: string;
        updated_by: string;
        created_at: string;
        created_by: string;
        revision: number;
    }>)[] | undefined;
    body?: Readonly<{} & {
        message: string;
    }> | undefined;
    name?: string | undefined;
    statusCode?: number | undefined;
    agent_diff?: Readonly<{
        meta?: Readonly<{} & {
            package: Readonly<{} & {
                name: string;
                version: string;
            }>;
        }> | undefined;
        streams?: Readonly<{
            id?: string | undefined;
        } & {
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
    }>[][] | undefined;
} & {
    hasErrors: boolean;
}>[]>;
