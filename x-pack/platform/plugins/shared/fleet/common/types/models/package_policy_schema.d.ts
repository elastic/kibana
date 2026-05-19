export declare const PackagePolicyNamespaceSchema: import("@kbn/config-schema").Type<string>;
export declare const ConfigRecordSchema: import("@kbn/config-schema").Type<Record<string, Readonly<{
    type?: string | undefined;
    value?: any;
    frozen?: boolean | undefined;
} & {}>>>;
export declare const VarGroupSelectionsSchema: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
export declare const DeprecationInfoSchema: import("@kbn/config-schema").ObjectType<{
    description: import("@kbn/config-schema").Type<string>;
    since: import("@kbn/config-schema").Type<string | undefined>;
    replaced_by: import("@kbn/config-schema").Type<Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined>;
}>;
export declare const PackagePolicyInputsSchema: {
    id: import("@kbn/config-schema").Type<string | undefined>;
    name: import("@kbn/config-schema").Type<string | undefined>;
    type: import("@kbn/config-schema").Type<string>;
    policy_template: import("@kbn/config-schema").Type<string | undefined>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    keep_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    vars: import("@kbn/config-schema").Type<Record<string, Readonly<{
        type?: string | undefined;
        value?: any;
        frozen?: boolean | undefined;
    } & {}>> | undefined>;
    var_group_selections: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    config: import("@kbn/config-schema").Type<Record<string, Readonly<{
        type?: string | undefined;
        value?: any;
        frozen?: boolean | undefined;
    } & {}>> | undefined>;
    streams: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
    condition: import("@kbn/config-schema").Type<string | undefined>;
    deprecated: import("@kbn/config-schema").Type<Readonly<{
        since?: string | undefined;
        replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
    } & {
        description: string;
    }> | undefined>;
    migrate_from: import("@kbn/config-schema").Type<string | undefined>;
};
export declare const ExperimentalDataStreamFeaturesSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    data_stream: string;
    features: Readonly<{
        synthetic_source?: boolean | undefined;
        tsdb?: boolean | undefined;
        doc_value_only_numeric?: boolean | undefined;
        doc_value_only_other?: boolean | undefined;
    } & {}>;
}>[]>;
export declare const PackagePolicyPackageSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    version: import("@kbn/config-schema").Type<string>;
    experimental_data_stream_features: import("@kbn/config-schema").Type<Readonly<{} & {
        data_stream: string;
        features: Readonly<{
            synthetic_source?: boolean | undefined;
            tsdb?: boolean | undefined;
            doc_value_only_numeric?: boolean | undefined;
            doc_value_only_other?: boolean | undefined;
        } & {}>;
    }>[] | undefined>;
    requires_root: import("@kbn/config-schema").Type<boolean | undefined>;
    fips_compatible: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const PackagePolicyBaseSchema: {
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
    }> | undefined>;
    inputs: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
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
};
export declare const NewPackagePolicySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    force: import("@kbn/config-schema").Type<boolean | undefined>;
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
    }> | undefined>;
    inputs: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
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
}>;
/**
 * Snapshot of the package policy SO schema as of model version 10.22.0.
 * Permissive on enabled, inputs, and package so the SO layer can store
 * internal shapes (e.g. compiled_input, minimal fixtures). If NewPackagePolicySchema
 * gains new fields, create PackagePolicySchemaV{next} that extends this one.
 */
export declare const PackagePolicySchemaV22: import("@kbn/config-schema").ObjectType<Omit<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    force: import("@kbn/config-schema").Type<boolean | undefined>;
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
    }> | undefined>;
    inputs: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
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
}, "enabled" | "package" | "condition" | "inputs" | "global_data_tags"> & {
    enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    package: import("@kbn/config-schema").Type<any>;
    inputs: import("@kbn/config-schema").Type<any[] | undefined>;
}>;
/**
 * Snapshot of the package policy SO schema as of model version 10.23.0.
 * Permissive on enabled, inputs, and package so the SO layer can store
 * internal shapes (e.g. compiled_input, minimal fixtures). If NewPackagePolicySchema
 * gains new fields, create PackagePolicySchemaV{next} that extends this one.
 */
export declare const PackagePolicySchemaV23: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    force: import("@kbn/config-schema").Type<boolean | undefined>;
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
    }> | undefined>;
    inputs: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
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
}, "enabled" | "package" | "condition" | "inputs" | "global_data_tags"> & {
    enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    package: import("@kbn/config-schema").Type<any>;
    inputs: import("@kbn/config-schema").Type<any[] | undefined>;
}, "global_data_tags"> & {
    global_data_tags: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        value: string | number;
    }>[] | null | undefined>;
}>;
/**
 * Snapshot of the package policy SO schema as of model version 10.24.0.
 * Re-introduces the `condition` field at the integration level — V22/V23 excluded it
 * to preserve their hashes when `condition` was added to PackagePolicyBaseSchema.
 */
export declare const PackagePolicySchemaV24: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    force: import("@kbn/config-schema").Type<boolean | undefined>;
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
    }> | undefined>;
    inputs: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
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
}, "enabled" | "package" | "condition" | "inputs" | "global_data_tags"> & {
    enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    package: import("@kbn/config-schema").Type<any>;
    inputs: import("@kbn/config-schema").Type<any[] | undefined>;
}, "global_data_tags"> & {
    global_data_tags: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        value: string | number;
    }>[] | null | undefined>;
}, "condition"> & {
    condition: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const CreatePackagePolicyRequestBodySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    force: import("@kbn/config-schema").Type<boolean | undefined>;
    supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
    enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    package: import("@kbn/config-schema").Type<Readonly<{
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
    }> | undefined>;
    inputs: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
    spaceIds: import("@kbn/config-schema").Type<string[] | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    namespace: import("@kbn/config-schema").Type<string | undefined>;
    policy_id: import("@kbn/config-schema").Type<string | null | undefined>;
    policy_ids: import("@kbn/config-schema").Type<string[] | undefined>;
    output_id: import("@kbn/config-schema").Type<string | null | undefined>;
    cloud_connector_id: import("@kbn/config-schema").Type<string | null | undefined>;
    cloud_connector_name: import("@kbn/config-schema").Type<string | null | undefined>;
    is_managed: import("@kbn/config-schema").Type<boolean | undefined>;
    vars: import("@kbn/config-schema").Type<Record<string, Readonly<{
        type?: string | undefined;
        value?: any;
        frozen?: boolean | undefined;
    } & {}>> | undefined>;
    var_group_selections: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    overrides: import("@kbn/config-schema").Type<Readonly<{
        inputs?: Record<string, any> | undefined;
    } & {}> | null | undefined>;
    supports_cloud_connector: import("@kbn/config-schema").Type<boolean | null | undefined>;
    additional_datastreams_permissions: import("@kbn/config-schema").Type<string[] | null | undefined>;
    package_agent_version_condition: import("@kbn/config-schema").Type<string | undefined>;
    condition: import("@kbn/config-schema").Type<string | undefined>;
    global_data_tags: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        value: string | number;
    }>[] | null | undefined>;
}>;
export declare const SimplifiedVarsSchema: import("@kbn/config-schema").Type<Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
    id: string;
    isSecretRef: boolean;
}> | null>>;
export declare const SimplifiedPackagePolicyInputsSchema: import("@kbn/config-schema").Type<Record<string, Readonly<{
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
} & {}>> | undefined>;
export declare const SimplifiedPackagePolicyBaseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    namespace: import("@kbn/config-schema").Type<string | undefined>;
    output_id: import("@kbn/config-schema").Type<string | null | undefined>;
    vars: import("@kbn/config-schema").Type<Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
        id: string;
        isSecretRef: boolean;
    }> | null> | undefined>;
    var_group_selections: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    inputs: import("@kbn/config-schema").Type<Record<string, Readonly<{
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
    } & {}>> | undefined>;
    supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
    additional_datastreams_permissions: import("@kbn/config-schema").Type<string[] | null | undefined>;
    condition: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const SimplifiedPackagePolicyPreconfiguredSchema: import("@kbn/config-schema").ObjectType<Omit<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    namespace: import("@kbn/config-schema").Type<string | undefined>;
    output_id: import("@kbn/config-schema").Type<string | null | undefined>;
    vars: import("@kbn/config-schema").Type<Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
        id: string;
        isSecretRef: boolean;
    }> | null> | undefined>;
    var_group_selections: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    inputs: import("@kbn/config-schema").Type<Record<string, Readonly<{
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
    } & {}>> | undefined>;
    supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
    additional_datastreams_permissions: import("@kbn/config-schema").Type<string[] | null | undefined>;
    condition: import("@kbn/config-schema").Type<string | undefined>;
}, "id" | "package"> & {
    id: import("@kbn/config-schema").Type<string>;
    package: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export declare const SimplifiedCreatePackagePolicyRequestBodySchema: import("@kbn/config-schema").ObjectType<Omit<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    namespace: import("@kbn/config-schema").Type<string | undefined>;
    output_id: import("@kbn/config-schema").Type<string | null | undefined>;
    vars: import("@kbn/config-schema").Type<Record<string, string | number | boolean | string[] | number[] | Readonly<{} & {
        id: string;
        isSecretRef: boolean;
    }> | null> | undefined>;
    var_group_selections: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    inputs: import("@kbn/config-schema").Type<Record<string, Readonly<{
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
    } & {}>> | undefined>;
    supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
    additional_datastreams_permissions: import("@kbn/config-schema").Type<string[] | null | undefined>;
    condition: import("@kbn/config-schema").Type<string | undefined>;
}, "package" | "force" | "policy_id" | "policy_ids" | "supports_agentless"> & {
    package: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string>;
        title: import("@kbn/config-schema").Type<string | undefined>;
        version: import("@kbn/config-schema").Type<string>;
        experimental_data_stream_features: import("@kbn/config-schema").Type<Readonly<{} & {
            data_stream: string;
            features: Readonly<{
                synthetic_source?: boolean | undefined;
                tsdb?: boolean | undefined;
                doc_value_only_numeric?: boolean | undefined;
                doc_value_only_other?: boolean | undefined;
            } & {}>;
        }>[] | undefined>;
        requires_root: import("@kbn/config-schema").Type<boolean | undefined>;
        fips_compatible: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    force: import("@kbn/config-schema").Type<boolean | undefined>;
    policy_id: import("@kbn/config-schema").Type<string | null | undefined>;
    policy_ids: import("@kbn/config-schema").Type<string[] | undefined>;
    supports_agentless: import("@kbn/config-schema").Type<boolean | null | undefined>;
}>;
export declare const UpdatePackagePolicyRequestBodySchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string | undefined>;
    inputs: import("@kbn/config-schema").Type<Readonly<{
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
    }>[] | undefined>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    force: import("@kbn/config-schema").Type<boolean | undefined>;
    enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    package: import("@kbn/config-schema").Type<Readonly<{
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
    }> | undefined>;
    spaceIds: import("@kbn/config-schema").Type<string[] | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    namespace: import("@kbn/config-schema").Type<string | undefined>;
    policy_id: import("@kbn/config-schema").Type<string | null | undefined>;
    policy_ids: import("@kbn/config-schema").Type<string[] | undefined>;
    output_id: import("@kbn/config-schema").Type<string | null | undefined>;
    cloud_connector_id: import("@kbn/config-schema").Type<string | null | undefined>;
    cloud_connector_name: import("@kbn/config-schema").Type<string | null | undefined>;
    is_managed: import("@kbn/config-schema").Type<boolean | undefined>;
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
}>;
export declare const UpdatePackagePolicySchema: import("@kbn/config-schema").ObjectType<{
    version: import("@kbn/config-schema").Type<string | undefined>;
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
    }> | undefined>;
    inputs: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
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
}>;
export declare const PackagePolicySchema: import("@kbn/config-schema").ObjectType<{
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
}>;
export declare const PackagePolicyResponseSchema: import("@kbn/config-schema").ObjectType<Omit<{
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
    }>[] | undefined>;
}>;
export declare const OrphanedPackagePoliciesResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
    total: import("@kbn/config-schema").Type<number>;
}>;
export declare const DryRunPackagePolicySchema: import("@kbn/config-schema").ObjectType<Omit<{
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
}, "id" | "errors" | "updated_at" | "updated_by" | "created_at" | "created_by" | "force" | "revision" | "missingVars"> & {
    id: import("@kbn/config-schema").Type<string | undefined>;
    errors: import("@kbn/config-schema").Type<Readonly<{
        key?: string | undefined;
    } & {
        message: string;
    }>[] | undefined>;
    updated_at: import("@kbn/config-schema").Type<string | undefined>;
    updated_by: import("@kbn/config-schema").Type<string | undefined>;
    created_at: import("@kbn/config-schema").Type<string | undefined>;
    created_by: import("@kbn/config-schema").Type<string | undefined>;
    force: import("@kbn/config-schema").Type<boolean | undefined>;
    revision: import("@kbn/config-schema").Type<number | undefined>;
    missingVars: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const PackagePolicyStatusResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    success: import("@kbn/config-schema").Type<boolean>;
    name: import("@kbn/config-schema").Type<string | undefined>;
    statusCode: import("@kbn/config-schema").Type<number | undefined>;
    body: import("@kbn/config-schema").Type<Readonly<{} & {
        message: string;
    }> | undefined>;
}>;
