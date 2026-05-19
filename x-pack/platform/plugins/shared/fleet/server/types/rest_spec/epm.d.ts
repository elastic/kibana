export declare const GetCategoriesRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
        include_policy_templates: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const GetCategoriesResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        parent_id?: string | undefined;
        parent_title?: string | undefined;
    } & {
        id: string;
        count: number;
        title: string;
    }>[]>;
}>;
export declare const GetPackagesRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        category: import("@kbn/config-schema").Type<string | undefined>;
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
        excludeInstallStatus: import("@kbn/config-schema").Type<boolean | undefined>;
        withPackagePoliciesCount: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const KibanaAssetReferenceSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    originId: import("@kbn/config-schema").Type<string | undefined>;
    deferred: import("@kbn/config-schema").Type<boolean | undefined>;
    type: import("@kbn/config-schema").Type<string>;
}>;
export declare const EsAssetReferenceSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<"index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view">;
    deferred: import("@kbn/config-schema").Type<boolean | undefined>;
    version: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const InstallationInfoSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<string>;
    created_at: import("@kbn/config-schema").Type<string | undefined>;
    updated_at: import("@kbn/config-schema").Type<string | undefined>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    installed_kibana: import("@kbn/config-schema").Type<Readonly<{
        originId?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: string;
    }>[]>;
    additional_spaces_installed_kibana: import("@kbn/config-schema").Type<Record<string, Readonly<{
        originId?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: string;
    }>[]> | undefined>;
    installed_es: import("@kbn/config-schema").Type<Readonly<{
        version?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
    }>[]>;
    name: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string>;
    install_status: import("@kbn/config-schema").Type<"installed" | "installing" | "install_failed">;
    install_source: import("@kbn/config-schema").Type<"registry" | "custom" | "upload" | "bundled">;
    installed_kibana_space_id: import("@kbn/config-schema").Type<string | undefined>;
    install_format_schema_version: import("@kbn/config-schema").Type<string | undefined>;
    verification_status: import("@kbn/config-schema").Type<"unknown" | "verified" | "unverified">;
    verification_key_id: import("@kbn/config-schema").Type<string | null | undefined>;
    experimental_data_stream_features: import("@kbn/config-schema").Type<Readonly<{} & {
        data_stream: string;
        features: Readonly<{
            synthetic_source?: boolean | undefined;
            tsdb?: boolean | undefined;
            doc_value_only_numeric?: boolean | undefined;
            doc_value_only_other?: boolean | undefined;
        } & {}>;
    }>[] | undefined>;
    latest_install_failed_attempts: import("@kbn/config-schema").Type<Readonly<{} & {
        error: Readonly<{
            stack?: string | undefined;
        } & {
            name: string;
            message: string;
        }>;
        created_at: string;
        target_version: string;
    }>[] | undefined>;
    latest_executed_state: import("@kbn/config-schema").Type<Readonly<{
        name?: string | undefined;
        error?: string | undefined;
        started_at?: string | undefined;
    } & {}> | undefined>;
    previous_version: import("@kbn/config-schema").Type<string | null | undefined>;
    rolled_back: import("@kbn/config-schema").Type<boolean | undefined>;
    is_rollback_ttl_expired: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const PackageInfoSchema: import("@kbn/config-schema").ObjectType<{
    status: import("@kbn/config-schema").Type<string | undefined>;
    installationInfo: import("@kbn/config-schema").Type<Readonly<{
        namespaces?: string[] | undefined;
        updated_at?: string | undefined;
        created_at?: string | undefined;
        additional_spaces_installed_kibana?: Record<string, Readonly<{
            originId?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: string;
        }>[]> | undefined;
        installed_kibana_space_id?: string | undefined;
        install_format_schema_version?: string | undefined;
        verification_key_id?: string | null | undefined;
        experimental_data_stream_features?: Readonly<{} & {
            data_stream: string;
            features: Readonly<{
                synthetic_source?: boolean | undefined;
                tsdb?: boolean | undefined;
                doc_value_only_numeric?: boolean | undefined;
                doc_value_only_other?: boolean | undefined;
            } & {}>;
        }>[] | undefined;
        latest_install_failed_attempts?: Readonly<{} & {
            error: Readonly<{
                stack?: string | undefined;
            } & {
                name: string;
                message: string;
            }>;
            created_at: string;
            target_version: string;
        }>[] | undefined;
        latest_executed_state?: Readonly<{
            name?: string | undefined;
            error?: string | undefined;
            started_at?: string | undefined;
        } & {}> | undefined;
        previous_version?: string | null | undefined;
        rolled_back?: boolean | undefined;
        is_rollback_ttl_expired?: boolean | undefined;
    } & {
        name: string;
        type: string;
        version: string;
        installed_kibana: Readonly<{
            originId?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: string;
        }>[];
        installed_es: Readonly<{
            version?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
        }>[];
        install_status: "installed" | "installing" | "install_failed";
        install_source: "registry" | "custom" | "upload" | "bundled";
        verification_status: "unknown" | "verified" | "unverified";
    }> | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    title: import("@kbn/config-schema").Type<string>;
    icons: import("@kbn/config-schema").Type<Readonly<{
        size?: string | undefined;
        type?: string | undefined;
        path?: string | undefined;
        title?: string | undefined;
        dark_mode?: boolean | undefined;
    } & {
        src: string;
    }>[] | undefined>;
    deprecated: import("@kbn/config-schema").Type<Readonly<{
        since?: string | undefined;
        replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
    } & {
        description: string;
    }> | undefined>;
    conditions: import("@kbn/config-schema").Type<Readonly<{
        kibana?: Readonly<{
            version?: string | undefined;
        } & {}> | undefined;
        elastic?: Readonly<{
            capabilities?: string[] | undefined;
            subscription?: string | undefined;
        } & {}> | undefined;
        deprecated?: Readonly<{
            since?: string | undefined;
            replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
        } & {
            description: string;
        }> | undefined;
    } & {}> | undefined>;
    release: import("@kbn/config-schema").Type<"experimental" | "beta" | "ga" | undefined>;
    type: import("@kbn/config-schema").Type<string | undefined>;
    path: import("@kbn/config-schema").Type<string | undefined>;
    download: import("@kbn/config-schema").Type<string | undefined>;
    internal: import("@kbn/config-schema").Type<boolean | undefined>;
    data_streams: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
    policy_templates: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
    categories: import("@kbn/config-schema").Type<string[] | undefined>;
    owner: import("@kbn/config-schema").Type<Readonly<{
        type?: "elastic" | "partner" | "community" | undefined;
        github?: string | undefined;
    } & {}> | undefined>;
    readme: import("@kbn/config-schema").Type<string | undefined>;
    signature_path: import("@kbn/config-schema").Type<string | undefined>;
    source: import("@kbn/config-schema").Type<Readonly<{} & {
        license: string;
    }> | undefined>;
    format_version: import("@kbn/config-schema").Type<string | undefined>;
    vars: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
    var_groups: import("@kbn/config-schema").Type<Readonly<{
        description?: string | undefined;
    } & {
        name: string;
        options: Readonly<{
            description?: string | undefined;
            hide_in_deployment_modes?: ("default" | "agentless")[] | undefined;
        } & {
            name: string;
            title: string;
            vars: string[];
        }>[];
        title: string;
        selector_title: string;
    }>[] | undefined>;
    latestVersion: import("@kbn/config-schema").Type<string | undefined>;
    discovery: import("@kbn/config-schema").Type<Readonly<{
        fields?: Readonly<{} & {
            name: string;
        }>[] | undefined;
        datasets?: Readonly<{} & {
            name: string;
        }>[] | undefined;
    } & {}> | undefined>;
}>;
export declare const PackageListItemSchema: import("@kbn/config-schema").ObjectType<Omit<{
    status: import("@kbn/config-schema").Type<string | undefined>;
    installationInfo: import("@kbn/config-schema").Type<Readonly<{
        namespaces?: string[] | undefined;
        updated_at?: string | undefined;
        created_at?: string | undefined;
        additional_spaces_installed_kibana?: Record<string, Readonly<{
            originId?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: string;
        }>[]> | undefined;
        installed_kibana_space_id?: string | undefined;
        install_format_schema_version?: string | undefined;
        verification_key_id?: string | null | undefined;
        experimental_data_stream_features?: Readonly<{} & {
            data_stream: string;
            features: Readonly<{
                synthetic_source?: boolean | undefined;
                tsdb?: boolean | undefined;
                doc_value_only_numeric?: boolean | undefined;
                doc_value_only_other?: boolean | undefined;
            } & {}>;
        }>[] | undefined;
        latest_install_failed_attempts?: Readonly<{} & {
            error: Readonly<{
                stack?: string | undefined;
            } & {
                name: string;
                message: string;
            }>;
            created_at: string;
            target_version: string;
        }>[] | undefined;
        latest_executed_state?: Readonly<{
            name?: string | undefined;
            error?: string | undefined;
            started_at?: string | undefined;
        } & {}> | undefined;
        previous_version?: string | null | undefined;
        rolled_back?: boolean | undefined;
        is_rollback_ttl_expired?: boolean | undefined;
    } & {
        name: string;
        type: string;
        version: string;
        installed_kibana: Readonly<{
            originId?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: string;
        }>[];
        installed_es: Readonly<{
            version?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
        }>[];
        install_status: "installed" | "installing" | "install_failed";
        install_source: "registry" | "custom" | "upload" | "bundled";
        verification_status: "unknown" | "verified" | "unverified";
    }> | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    title: import("@kbn/config-schema").Type<string>;
    icons: import("@kbn/config-schema").Type<Readonly<{
        size?: string | undefined;
        type?: string | undefined;
        path?: string | undefined;
        title?: string | undefined;
        dark_mode?: boolean | undefined;
    } & {
        src: string;
    }>[] | undefined>;
    deprecated: import("@kbn/config-schema").Type<Readonly<{
        since?: string | undefined;
        replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
    } & {
        description: string;
    }> | undefined>;
    conditions: import("@kbn/config-schema").Type<Readonly<{
        kibana?: Readonly<{
            version?: string | undefined;
        } & {}> | undefined;
        elastic?: Readonly<{
            capabilities?: string[] | undefined;
            subscription?: string | undefined;
        } & {}> | undefined;
        deprecated?: Readonly<{
            since?: string | undefined;
            replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
        } & {
            description: string;
        }> | undefined;
    } & {}> | undefined>;
    release: import("@kbn/config-schema").Type<"experimental" | "beta" | "ga" | undefined>;
    type: import("@kbn/config-schema").Type<string | undefined>;
    path: import("@kbn/config-schema").Type<string | undefined>;
    download: import("@kbn/config-schema").Type<string | undefined>;
    internal: import("@kbn/config-schema").Type<boolean | undefined>;
    data_streams: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
    policy_templates: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
    categories: import("@kbn/config-schema").Type<string[] | undefined>;
    owner: import("@kbn/config-schema").Type<Readonly<{
        type?: "elastic" | "partner" | "community" | undefined;
        github?: string | undefined;
    } & {}> | undefined>;
    readme: import("@kbn/config-schema").Type<string | undefined>;
    signature_path: import("@kbn/config-schema").Type<string | undefined>;
    source: import("@kbn/config-schema").Type<Readonly<{} & {
        license: string;
    }> | undefined>;
    format_version: import("@kbn/config-schema").Type<string | undefined>;
    vars: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
    var_groups: import("@kbn/config-schema").Type<Readonly<{
        description?: string | undefined;
    } & {
        name: string;
        options: Readonly<{
            description?: string | undefined;
            hide_in_deployment_modes?: ("default" | "agentless")[] | undefined;
        } & {
            name: string;
            title: string;
            vars: string[];
        }>[];
        title: string;
        selector_title: string;
    }>[] | undefined>;
    latestVersion: import("@kbn/config-schema").Type<string | undefined>;
    discovery: import("@kbn/config-schema").Type<Readonly<{
        fields?: Readonly<{} & {
            name: string;
        }>[] | undefined;
        datasets?: Readonly<{} & {
            name: string;
        }>[] | undefined;
    } & {}> | undefined>;
}, "id" | "integration"> & {
    id: import("@kbn/config-schema").Type<string>;
    integration: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const GetPackagesResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        status?: string | undefined;
        type?: string | undefined;
        source?: Readonly<{} & {
            license: string;
        }> | undefined;
        path?: string | undefined;
        description?: string | undefined;
        internal?: boolean | undefined;
        deprecated?: Readonly<{
            since?: string | undefined;
            replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
        } & {
            description: string;
        }> | undefined;
        data_streams?: Record<string, any>[] | undefined;
        download?: string | undefined;
        owner?: Readonly<{
            type?: "elastic" | "partner" | "community" | undefined;
            github?: string | undefined;
        } & {}> | undefined;
        latestVersion?: string | undefined;
        categories?: string[] | undefined;
        icons?: Readonly<{
            size?: string | undefined;
            type?: string | undefined;
            path?: string | undefined;
            title?: string | undefined;
            dark_mode?: boolean | undefined;
        } & {
            src: string;
        }>[] | undefined;
        discovery?: Readonly<{
            fields?: Readonly<{} & {
                name: string;
            }>[] | undefined;
            datasets?: Readonly<{} & {
                name: string;
            }>[] | undefined;
        } & {}> | undefined;
        integration?: string | undefined;
        conditions?: Readonly<{
            kibana?: Readonly<{
                version?: string | undefined;
            } & {}> | undefined;
            elastic?: Readonly<{
                capabilities?: string[] | undefined;
                subscription?: string | undefined;
            } & {}> | undefined;
            deprecated?: Readonly<{
                since?: string | undefined;
                replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
            } & {
                description: string;
            }> | undefined;
        } & {}> | undefined;
        vars?: Record<string, any>[] | undefined;
        release?: "experimental" | "beta" | "ga" | undefined;
        format_version?: string | undefined;
        policy_templates?: Record<string, any>[] | undefined;
        var_groups?: Readonly<{
            description?: string | undefined;
        } & {
            name: string;
            options: Readonly<{
                description?: string | undefined;
                hide_in_deployment_modes?: ("default" | "agentless")[] | undefined;
            } & {
                name: string;
                title: string;
                vars: string[];
            }>[];
            title: string;
            selector_title: string;
        }>[] | undefined;
        signature_path?: string | undefined;
        readme?: string | undefined;
        installationInfo?: Readonly<{
            namespaces?: string[] | undefined;
            updated_at?: string | undefined;
            created_at?: string | undefined;
            additional_spaces_installed_kibana?: Record<string, Readonly<{
                originId?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: string;
            }>[]> | undefined;
            installed_kibana_space_id?: string | undefined;
            install_format_schema_version?: string | undefined;
            verification_key_id?: string | null | undefined;
            experimental_data_stream_features?: Readonly<{} & {
                data_stream: string;
                features: Readonly<{
                    synthetic_source?: boolean | undefined;
                    tsdb?: boolean | undefined;
                    doc_value_only_numeric?: boolean | undefined;
                    doc_value_only_other?: boolean | undefined;
                } & {}>;
            }>[] | undefined;
            latest_install_failed_attempts?: Readonly<{} & {
                error: Readonly<{
                    stack?: string | undefined;
                } & {
                    name: string;
                    message: string;
                }>;
                created_at: string;
                target_version: string;
            }>[] | undefined;
            latest_executed_state?: Readonly<{
                name?: string | undefined;
                error?: string | undefined;
                started_at?: string | undefined;
            } & {}> | undefined;
            previous_version?: string | null | undefined;
            rolled_back?: boolean | undefined;
            is_rollback_ttl_expired?: boolean | undefined;
        } & {
            name: string;
            type: string;
            version: string;
            installed_kibana: Readonly<{
                originId?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: string;
            }>[];
            installed_es: Readonly<{
                version?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
            }>[];
            install_status: "installed" | "installing" | "install_failed";
            install_source: "registry" | "custom" | "upload" | "bundled";
            verification_status: "unknown" | "verified" | "unverified";
        }> | undefined;
    } & {
        name: string;
        id: string;
        version: string;
        title: string;
    }>[]>;
}>;
export declare const InstalledPackageSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string>;
    status: import("@kbn/config-schema").Type<string>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    icons: import("@kbn/config-schema").Type<Readonly<{
        size?: string | undefined;
        type?: string | undefined;
        path?: string | undefined;
        title?: string | undefined;
        dark_mode?: boolean | undefined;
    } & {
        src: string;
    }>[] | undefined>;
    dataStreams: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        title: string;
    }>[]>;
}>;
export declare const GetInstalledPackagesResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        description?: string | undefined;
        title?: string | undefined;
        icons?: Readonly<{
            size?: string | undefined;
            type?: string | undefined;
            path?: string | undefined;
            title?: string | undefined;
            dark_mode?: boolean | undefined;
        } & {
            src: string;
        }>[] | undefined;
    } & {
        name: string;
        status: string;
        version: string;
        dataStreams: Readonly<{} & {
            name: string;
            title: string;
        }>[];
    }>[]>;
    total: import("@kbn/config-schema").Type<number>;
    searchAfter: import("@kbn/config-schema").Type<any[] | undefined>;
}>;
export declare const GetLimitedPackagesResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const GetStatsResponseSchema: import("@kbn/config-schema").ObjectType<{
    response: import("@kbn/config-schema").ObjectType<{
        agent_policy_count: import("@kbn/config-schema").Type<number>;
        package_policy_count: import("@kbn/config-schema").Type<number>;
    }>;
}>;
export declare const GetInputsResponseSchema: import("@kbn/config-schema").Type<string | Readonly<{
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
    extensions?: Record<string, any> | undefined;
    receivers?: Record<string, any> | undefined;
} & {
    inputs: Readonly<{
        streams?: Readonly<{} & {
            id: string;
            data_stream: Readonly<{
                type?: string | undefined;
            } & {
                dataset: string;
            }>;
        }>[] | undefined;
    } & {
        id: string;
        type: string;
    }>[];
}>>;
export declare const GetFileResponseSchema: import("@kbn/config-schema").AnyType;
export declare const PackageMetadataSchema: import("@kbn/config-schema").ObjectType<{
    has_policies: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const GetPackageInfoSchema: import("@kbn/config-schema").ObjectType<Omit<{
    status: import("@kbn/config-schema").Type<string | undefined>;
    installationInfo: import("@kbn/config-schema").Type<Readonly<{
        namespaces?: string[] | undefined;
        updated_at?: string | undefined;
        created_at?: string | undefined;
        additional_spaces_installed_kibana?: Record<string, Readonly<{
            originId?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: string;
        }>[]> | undefined;
        installed_kibana_space_id?: string | undefined;
        install_format_schema_version?: string | undefined;
        verification_key_id?: string | null | undefined;
        experimental_data_stream_features?: Readonly<{} & {
            data_stream: string;
            features: Readonly<{
                synthetic_source?: boolean | undefined;
                tsdb?: boolean | undefined;
                doc_value_only_numeric?: boolean | undefined;
                doc_value_only_other?: boolean | undefined;
            } & {}>;
        }>[] | undefined;
        latest_install_failed_attempts?: Readonly<{} & {
            error: Readonly<{
                stack?: string | undefined;
            } & {
                name: string;
                message: string;
            }>;
            created_at: string;
            target_version: string;
        }>[] | undefined;
        latest_executed_state?: Readonly<{
            name?: string | undefined;
            error?: string | undefined;
            started_at?: string | undefined;
        } & {}> | undefined;
        previous_version?: string | null | undefined;
        rolled_back?: boolean | undefined;
        is_rollback_ttl_expired?: boolean | undefined;
    } & {
        name: string;
        type: string;
        version: string;
        installed_kibana: Readonly<{
            originId?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: string;
        }>[];
        installed_es: Readonly<{
            version?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
        }>[];
        install_status: "installed" | "installing" | "install_failed";
        install_source: "registry" | "custom" | "upload" | "bundled";
        verification_status: "unknown" | "verified" | "unverified";
    }> | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    title: import("@kbn/config-schema").Type<string>;
    icons: import("@kbn/config-schema").Type<Readonly<{
        size?: string | undefined;
        type?: string | undefined;
        path?: string | undefined;
        title?: string | undefined;
        dark_mode?: boolean | undefined;
    } & {
        src: string;
    }>[] | undefined>;
    deprecated: import("@kbn/config-schema").Type<Readonly<{
        since?: string | undefined;
        replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
    } & {
        description: string;
    }> | undefined>;
    conditions: import("@kbn/config-schema").Type<Readonly<{
        kibana?: Readonly<{
            version?: string | undefined;
        } & {}> | undefined;
        elastic?: Readonly<{
            capabilities?: string[] | undefined;
            subscription?: string | undefined;
        } & {}> | undefined;
        deprecated?: Readonly<{
            since?: string | undefined;
            replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
        } & {
            description: string;
        }> | undefined;
    } & {}> | undefined>;
    release: import("@kbn/config-schema").Type<"experimental" | "beta" | "ga" | undefined>;
    type: import("@kbn/config-schema").Type<string | undefined>;
    path: import("@kbn/config-schema").Type<string | undefined>;
    download: import("@kbn/config-schema").Type<string | undefined>;
    internal: import("@kbn/config-schema").Type<boolean | undefined>;
    data_streams: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
    policy_templates: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
    categories: import("@kbn/config-schema").Type<string[] | undefined>;
    owner: import("@kbn/config-schema").Type<Readonly<{
        type?: "elastic" | "partner" | "community" | undefined;
        github?: string | undefined;
    } & {}> | undefined>;
    readme: import("@kbn/config-schema").Type<string | undefined>;
    signature_path: import("@kbn/config-schema").Type<string | undefined>;
    source: import("@kbn/config-schema").Type<Readonly<{} & {
        license: string;
    }> | undefined>;
    format_version: import("@kbn/config-schema").Type<string | undefined>;
    vars: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
    var_groups: import("@kbn/config-schema").Type<Readonly<{
        description?: string | undefined;
    } & {
        name: string;
        options: Readonly<{
            description?: string | undefined;
            hide_in_deployment_modes?: ("default" | "agentless")[] | undefined;
        } & {
            name: string;
            title: string;
            vars: string[];
        }>[];
        title: string;
        selector_title: string;
    }>[] | undefined>;
    latestVersion: import("@kbn/config-schema").Type<string | undefined>;
    discovery: import("@kbn/config-schema").Type<Readonly<{
        fields?: Readonly<{} & {
            name: string;
        }>[] | undefined;
        datasets?: Readonly<{} & {
            name: string;
        }>[] | undefined;
    } & {}> | undefined>;
}, "license" | "agent" | "elasticsearch" | "notice" | "assets" | "screenshots" | "asset_tags" | "licensePath" | "keepPoliciesUpToDate"> & {
    license: import("@kbn/config-schema").Type<string | undefined>;
    agent: import("@kbn/config-schema").Type<Readonly<{
        privileges?: Readonly<{
            root?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    elasticsearch: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    notice: import("@kbn/config-schema").Type<string | undefined>;
    assets: import("@kbn/config-schema").Type<Record<string, any>>;
    screenshots: import("@kbn/config-schema").Type<Readonly<{
        size?: string | undefined;
        type?: string | undefined;
        path?: string | undefined;
        title?: string | undefined;
        dark_mode?: boolean | undefined;
    } & {
        src: string;
    }>[] | undefined>;
    asset_tags: import("@kbn/config-schema").Type<Readonly<{
        asset_types?: string[] | undefined;
        asset_ids?: string[] | undefined;
    } & {
        text: string;
    }>[] | undefined>;
    licensePath: import("@kbn/config-schema").Type<string | undefined>;
    keepPoliciesUpToDate: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const GetInfoResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<Omit<{
        status: import("@kbn/config-schema").Type<string | undefined>;
        installationInfo: import("@kbn/config-schema").Type<Readonly<{
            namespaces?: string[] | undefined;
            updated_at?: string | undefined;
            created_at?: string | undefined;
            additional_spaces_installed_kibana?: Record<string, Readonly<{
                originId?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: string;
            }>[]> | undefined;
            installed_kibana_space_id?: string | undefined;
            install_format_schema_version?: string | undefined;
            verification_key_id?: string | null | undefined;
            experimental_data_stream_features?: Readonly<{} & {
                data_stream: string;
                features: Readonly<{
                    synthetic_source?: boolean | undefined;
                    tsdb?: boolean | undefined;
                    doc_value_only_numeric?: boolean | undefined;
                    doc_value_only_other?: boolean | undefined;
                } & {}>;
            }>[] | undefined;
            latest_install_failed_attempts?: Readonly<{} & {
                error: Readonly<{
                    stack?: string | undefined;
                } & {
                    name: string;
                    message: string;
                }>;
                created_at: string;
                target_version: string;
            }>[] | undefined;
            latest_executed_state?: Readonly<{
                name?: string | undefined;
                error?: string | undefined;
                started_at?: string | undefined;
            } & {}> | undefined;
            previous_version?: string | null | undefined;
            rolled_back?: boolean | undefined;
            is_rollback_ttl_expired?: boolean | undefined;
        } & {
            name: string;
            type: string;
            version: string;
            installed_kibana: Readonly<{
                originId?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: string;
            }>[];
            installed_es: Readonly<{
                version?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
            }>[];
            install_status: "installed" | "installing" | "install_failed";
            install_source: "registry" | "custom" | "upload" | "bundled";
            verification_status: "unknown" | "verified" | "unverified";
        }> | undefined>;
        name: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        title: import("@kbn/config-schema").Type<string>;
        icons: import("@kbn/config-schema").Type<Readonly<{
            size?: string | undefined;
            type?: string | undefined;
            path?: string | undefined;
            title?: string | undefined;
            dark_mode?: boolean | undefined;
        } & {
            src: string;
        }>[] | undefined>;
        deprecated: import("@kbn/config-schema").Type<Readonly<{
            since?: string | undefined;
            replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
        } & {
            description: string;
        }> | undefined>;
        conditions: import("@kbn/config-schema").Type<Readonly<{
            kibana?: Readonly<{
                version?: string | undefined;
            } & {}> | undefined;
            elastic?: Readonly<{
                capabilities?: string[] | undefined;
                subscription?: string | undefined;
            } & {}> | undefined;
            deprecated?: Readonly<{
                since?: string | undefined;
                replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
            } & {
                description: string;
            }> | undefined;
        } & {}> | undefined>;
        release: import("@kbn/config-schema").Type<"experimental" | "beta" | "ga" | undefined>;
        type: import("@kbn/config-schema").Type<string | undefined>;
        path: import("@kbn/config-schema").Type<string | undefined>;
        download: import("@kbn/config-schema").Type<string | undefined>;
        internal: import("@kbn/config-schema").Type<boolean | undefined>;
        data_streams: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
        policy_templates: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
        categories: import("@kbn/config-schema").Type<string[] | undefined>;
        owner: import("@kbn/config-schema").Type<Readonly<{
            type?: "elastic" | "partner" | "community" | undefined;
            github?: string | undefined;
        } & {}> | undefined>;
        readme: import("@kbn/config-schema").Type<string | undefined>;
        signature_path: import("@kbn/config-schema").Type<string | undefined>;
        source: import("@kbn/config-schema").Type<Readonly<{} & {
            license: string;
        }> | undefined>;
        format_version: import("@kbn/config-schema").Type<string | undefined>;
        vars: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
        var_groups: import("@kbn/config-schema").Type<Readonly<{
            description?: string | undefined;
        } & {
            name: string;
            options: Readonly<{
                description?: string | undefined;
                hide_in_deployment_modes?: ("default" | "agentless")[] | undefined;
            } & {
                name: string;
                title: string;
                vars: string[];
            }>[];
            title: string;
            selector_title: string;
        }>[] | undefined>;
        latestVersion: import("@kbn/config-schema").Type<string | undefined>;
        discovery: import("@kbn/config-schema").Type<Readonly<{
            fields?: Readonly<{} & {
                name: string;
            }>[] | undefined;
            datasets?: Readonly<{} & {
                name: string;
            }>[] | undefined;
        } & {}> | undefined>;
    }, "license" | "agent" | "elasticsearch" | "notice" | "assets" | "screenshots" | "asset_tags" | "licensePath" | "keepPoliciesUpToDate"> & {
        license: import("@kbn/config-schema").Type<string | undefined>;
        agent: import("@kbn/config-schema").Type<Readonly<{
            privileges?: Readonly<{
                root?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
        elasticsearch: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
        notice: import("@kbn/config-schema").Type<string | undefined>;
        assets: import("@kbn/config-schema").Type<Record<string, any>>;
        screenshots: import("@kbn/config-schema").Type<Readonly<{
            size?: string | undefined;
            type?: string | undefined;
            path?: string | undefined;
            title?: string | undefined;
            dark_mode?: boolean | undefined;
        } & {
            src: string;
        }>[] | undefined>;
        asset_tags: import("@kbn/config-schema").Type<Readonly<{
            asset_types?: string[] | undefined;
            asset_ids?: string[] | undefined;
        } & {
            text: string;
        }>[] | undefined>;
        licensePath: import("@kbn/config-schema").Type<string | undefined>;
        keepPoliciesUpToDate: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    metadata: import("@kbn/config-schema").Type<Readonly<{} & {
        has_policies: boolean;
    }> | undefined>;
}>;
export declare const GetKnowledgeBaseResponseSchema: import("@kbn/config-schema").ObjectType<{
    package: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string>;
    }>;
    items: import("@kbn/config-schema").Type<Readonly<{} & {
        content: string;
        version: string;
        path: string;
        fileName: string;
        installed_at: string;
    }>[]>;
}>;
export declare const UpdatePackageResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<Omit<{
        status: import("@kbn/config-schema").Type<string | undefined>;
        installationInfo: import("@kbn/config-schema").Type<Readonly<{
            namespaces?: string[] | undefined;
            updated_at?: string | undefined;
            created_at?: string | undefined;
            additional_spaces_installed_kibana?: Record<string, Readonly<{
                originId?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: string;
            }>[]> | undefined;
            installed_kibana_space_id?: string | undefined;
            install_format_schema_version?: string | undefined;
            verification_key_id?: string | null | undefined;
            experimental_data_stream_features?: Readonly<{} & {
                data_stream: string;
                features: Readonly<{
                    synthetic_source?: boolean | undefined;
                    tsdb?: boolean | undefined;
                    doc_value_only_numeric?: boolean | undefined;
                    doc_value_only_other?: boolean | undefined;
                } & {}>;
            }>[] | undefined;
            latest_install_failed_attempts?: Readonly<{} & {
                error: Readonly<{
                    stack?: string | undefined;
                } & {
                    name: string;
                    message: string;
                }>;
                created_at: string;
                target_version: string;
            }>[] | undefined;
            latest_executed_state?: Readonly<{
                name?: string | undefined;
                error?: string | undefined;
                started_at?: string | undefined;
            } & {}> | undefined;
            previous_version?: string | null | undefined;
            rolled_back?: boolean | undefined;
            is_rollback_ttl_expired?: boolean | undefined;
        } & {
            name: string;
            type: string;
            version: string;
            installed_kibana: Readonly<{
                originId?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: string;
            }>[];
            installed_es: Readonly<{
                version?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
            }>[];
            install_status: "installed" | "installing" | "install_failed";
            install_source: "registry" | "custom" | "upload" | "bundled";
            verification_status: "unknown" | "verified" | "unverified";
        }> | undefined>;
        name: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        title: import("@kbn/config-schema").Type<string>;
        icons: import("@kbn/config-schema").Type<Readonly<{
            size?: string | undefined;
            type?: string | undefined;
            path?: string | undefined;
            title?: string | undefined;
            dark_mode?: boolean | undefined;
        } & {
            src: string;
        }>[] | undefined>;
        deprecated: import("@kbn/config-schema").Type<Readonly<{
            since?: string | undefined;
            replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
        } & {
            description: string;
        }> | undefined>;
        conditions: import("@kbn/config-schema").Type<Readonly<{
            kibana?: Readonly<{
                version?: string | undefined;
            } & {}> | undefined;
            elastic?: Readonly<{
                capabilities?: string[] | undefined;
                subscription?: string | undefined;
            } & {}> | undefined;
            deprecated?: Readonly<{
                since?: string | undefined;
                replaced_by?: Record<"input" | "package" | "dataStream" | "variable" | "policyTemplate", string> | undefined;
            } & {
                description: string;
            }> | undefined;
        } & {}> | undefined>;
        release: import("@kbn/config-schema").Type<"experimental" | "beta" | "ga" | undefined>;
        type: import("@kbn/config-schema").Type<string | undefined>;
        path: import("@kbn/config-schema").Type<string | undefined>;
        download: import("@kbn/config-schema").Type<string | undefined>;
        internal: import("@kbn/config-schema").Type<boolean | undefined>;
        data_streams: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
        policy_templates: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
        categories: import("@kbn/config-schema").Type<string[] | undefined>;
        owner: import("@kbn/config-schema").Type<Readonly<{
            type?: "elastic" | "partner" | "community" | undefined;
            github?: string | undefined;
        } & {}> | undefined>;
        readme: import("@kbn/config-schema").Type<string | undefined>;
        signature_path: import("@kbn/config-schema").Type<string | undefined>;
        source: import("@kbn/config-schema").Type<Readonly<{} & {
            license: string;
        }> | undefined>;
        format_version: import("@kbn/config-schema").Type<string | undefined>;
        vars: import("@kbn/config-schema").Type<Record<string, any>[] | undefined>;
        var_groups: import("@kbn/config-schema").Type<Readonly<{
            description?: string | undefined;
        } & {
            name: string;
            options: Readonly<{
                description?: string | undefined;
                hide_in_deployment_modes?: ("default" | "agentless")[] | undefined;
            } & {
                name: string;
                title: string;
                vars: string[];
            }>[];
            title: string;
            selector_title: string;
        }>[] | undefined>;
        latestVersion: import("@kbn/config-schema").Type<string | undefined>;
        discovery: import("@kbn/config-schema").Type<Readonly<{
            fields?: Readonly<{} & {
                name: string;
            }>[] | undefined;
            datasets?: Readonly<{} & {
                name: string;
            }>[] | undefined;
        } & {}> | undefined>;
    }, "license" | "agent" | "elasticsearch" | "notice" | "assets" | "screenshots" | "asset_tags" | "licensePath" | "keepPoliciesUpToDate"> & {
        license: import("@kbn/config-schema").Type<string | undefined>;
        agent: import("@kbn/config-schema").Type<Readonly<{
            privileges?: Readonly<{
                root?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
        elasticsearch: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
        notice: import("@kbn/config-schema").Type<string | undefined>;
        assets: import("@kbn/config-schema").Type<Record<string, any>>;
        screenshots: import("@kbn/config-schema").Type<Readonly<{
            size?: string | undefined;
            type?: string | undefined;
            path?: string | undefined;
            title?: string | undefined;
            dark_mode?: boolean | undefined;
        } & {
            src: string;
        }>[] | undefined>;
        asset_tags: import("@kbn/config-schema").Type<Readonly<{
            asset_types?: string[] | undefined;
            asset_ids?: string[] | undefined;
        } & {
            text: string;
        }>[] | undefined>;
        licensePath: import("@kbn/config-schema").Type<string | undefined>;
        keepPoliciesUpToDate: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
}>;
export declare const AssetReferenceSchema: import("@kbn/config-schema").Type<Readonly<{
    originId?: string | undefined;
    deferred?: boolean | undefined;
} & {
    id: string;
    type: string;
}> | Readonly<{
    version?: string | undefined;
    deferred?: boolean | undefined;
} & {
    id: string;
    type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
}>>;
export declare const InstallPackageResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<(Readonly<{
        originId?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: string;
    }> | Readonly<{
        version?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
    }>)[]>;
    _meta: import("@kbn/config-schema").ObjectType<{
        install_source: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export declare const InstallKibanaAssetsResponseSchema: import("@kbn/config-schema").ObjectType<{
    success: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const DeletePackageDatastreamAssetsResponseSchema: import("@kbn/config-schema").ObjectType<{
    success: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const BulkInstallPackagesResponseItemSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    name: string;
    version: string;
    result: Readonly<{
        error?: any;
        status?: "installed" | "already_installed" | undefined;
        assets?: (Readonly<{
            originId?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: string;
        }> | Readonly<{
            version?: string | undefined;
            deferred?: boolean | undefined;
        } & {
            id: string;
            type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
        }>)[] | undefined;
        installSource?: string | undefined;
    } & {
        installType: string;
    }>;
}> | Readonly<{
    error?: any;
} & {
    name: string;
    statusCode: number;
}>>;
export declare const BulkInstallPackagesFromRegistryResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<(Readonly<{} & {
        name: string;
        version: string;
        result: Readonly<{
            error?: any;
            status?: "installed" | "already_installed" | undefined;
            assets?: (Readonly<{
                originId?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: string;
            }> | Readonly<{
                version?: string | undefined;
                deferred?: boolean | undefined;
            } & {
                id: string;
                type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
            }>)[] | undefined;
            installSource?: string | undefined;
        } & {
            installType: string;
        }>;
    }> | Readonly<{
        error?: any;
    } & {
        name: string;
        statusCode: number;
    }>)[]>;
}>;
export declare const BulkUpgradePackagesResponseSchema: import("@kbn/config-schema").ObjectType<{
    taskId: import("@kbn/config-schema").Type<string>;
}>;
export declare const BulkRollbackPackagesResponseSchema: import("@kbn/config-schema").ObjectType<{
    taskId: import("@kbn/config-schema").Type<string>;
}>;
export declare const GetOneBulkOperationPackagesResponseSchema: import("@kbn/config-schema").ObjectType<{
    status: import("@kbn/config-schema").Type<string>;
    error: import("@kbn/config-schema").Type<Readonly<{} & {
        message: string;
    }> | undefined>;
    results: import("@kbn/config-schema").Type<Readonly<{
        error?: Readonly<{} & {
            message: string;
        }> | undefined;
    } & {
        name: string;
        success: boolean;
    }>[] | undefined>;
}>;
export declare const DeletePackageResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<(Readonly<{
        originId?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: string;
    }> | Readonly<{
        version?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: "index" | "transform" | "index_template" | "component_template" | "ingest_pipeline" | "knowledge_base" | "ilm_policy" | "data_stream_ilm_policy" | "ml_model" | "esql_view";
    }>)[]>;
}>;
export declare const GetVerificationKeyIdResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | null>;
}>;
export declare const GetDataStreamsResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
    }>[]>;
}>;
export declare const GetBulkAssetsResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        updatedAt?: string | undefined;
        appLink?: string | undefined;
    } & {
        id: string;
        type: string;
        attributes: Readonly<{
            service?: string | undefined;
            description?: string | undefined;
            title?: string | undefined;
        } & {}>;
    }>[]>;
}>;
export declare const ReauthorizeTransformResponseSchema: import("@kbn/config-schema").Type<Readonly<{
    error?: any;
} & {
    success: boolean;
    transformId: string;
}>[]>;
export declare const RollbackPackageResponseSchema: import("@kbn/config-schema").ObjectType<{
    version: import("@kbn/config-schema").Type<string>;
    success: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const GetInstalledPackagesRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        dataStreamType: import("@kbn/config-schema").Type<"synthetics" | "metrics" | "profiling" | "logs" | "traces" | undefined>;
        showOnlyActiveDataStreams: import("@kbn/config-schema").Type<boolean | undefined>;
        nameQuery: import("@kbn/config-schema").Type<string | undefined>;
        searchAfter: import("@kbn/config-schema").Type<(string | number)[] | undefined>;
        perPage: import("@kbn/config-schema").Type<number>;
        sortOrder: import("@kbn/config-schema").Type<"asc" | "desc">;
    }>;
};
export declare const GetDataStreamsRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"synthetics" | "metrics" | "profiling" | "logs" | "traces" | undefined>;
        datasetQuery: import("@kbn/config-schema").Type<string | undefined>;
        sortOrder: import("@kbn/config-schema").Type<"asc" | "desc">;
        uncategorisedOnly: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const GetLimitedPackagesRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const GetFileRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
        filePath: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const GetInfoRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        ignoreUnverified: import("@kbn/config-schema").Type<boolean | undefined>;
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
        full: import("@kbn/config-schema").Type<boolean | undefined>;
        withMetadata: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const GetInfoWithoutVersionRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        ignoreUnverified: import("@kbn/config-schema").Type<boolean | undefined>;
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
        full: import("@kbn/config-schema").Type<boolean | undefined>;
        withMetadata: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const GetKnowledgeBaseRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const GetBulkAssetsRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        assetIds: import("@kbn/config-schema").Type<Readonly<{} & {
            id: string;
            type: string;
        }>[]>;
    }>;
};
export declare const UpdatePackageRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        keepPoliciesUpToDate: import("@kbn/config-schema").Type<boolean | undefined>;
        namespace_customization_enabled_for: import("@kbn/config-schema").Type<string[] | undefined>;
    }>;
};
export declare const UpdatePackageWithoutVersionRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        keepPoliciesUpToDate: import("@kbn/config-schema").Type<boolean | undefined>;
        namespace_customization_enabled_for: import("@kbn/config-schema").Type<string[] | undefined>;
    }>;
};
export declare const BulkNamespaceCustomizationRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        packages: import("@kbn/config-schema").Type<string[]>;
        enable: import("@kbn/config-schema").Type<string[] | undefined>;
        disable: import("@kbn/config-schema").Type<string[] | undefined>;
    }>;
};
export declare const BulkNamespaceCustomizationResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        error?: string | undefined;
        namespace_customization_enabled_for?: string[] | undefined;
    } & {
        name: string;
        success: boolean;
    }>[]>;
}>;
export declare const ReviewUpgradeRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        action: import("@kbn/config-schema").Type<"pending" | "accept" | "decline">;
        target_version: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const ReviewUpgradeResponseSchema: import("@kbn/config-schema").ObjectType<{
    success: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const GetStatsRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const GetDependenciesRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const GetDependenciesResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        version: string;
        title: string;
    }>[]>;
}>;
export declare const InstallPackageFromRegistryRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
        ignoreMappingUpdateErrors: import("@kbn/config-schema").Type<boolean>;
        skipDataStreamRollover: import("@kbn/config-schema").Type<boolean>;
        skipDependencyCheck: import("@kbn/config-schema").Type<boolean>;
    }>;
    body: import("@kbn/config-schema").Type<Readonly<{} & {
        force: boolean;
        ignore_constraints: boolean;
    }> | null>;
};
export declare const InstallPackageFromRegistryWithoutVersionRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
        ignoreMappingUpdateErrors: import("@kbn/config-schema").Type<boolean>;
        skipDataStreamRollover: import("@kbn/config-schema").Type<boolean>;
        skipDependencyCheck: import("@kbn/config-schema").Type<boolean>;
    }>;
    body: import("@kbn/config-schema").Type<Readonly<{} & {
        force: boolean;
        ignore_constraints: boolean;
    }> | null>;
};
export declare const ReauthorizeTransformRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        transforms: import("@kbn/config-schema").Type<Readonly<{} & {
            transformId: string;
        }>[]>;
    }>;
};
export declare const BulkInstallPackagesFromRegistryRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        packages: import("@kbn/config-schema").Type<(string | Readonly<{
            prerelease?: boolean | undefined;
        } & {
            name: string;
            version: string;
        }>)[]>;
        force: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const GetOneBulkOperationPackagesRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        taskId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const BulkUpgradePackagesRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        packages: import("@kbn/config-schema").Type<Readonly<{
            version?: string | undefined;
        } & {
            name: string;
        }>[]>;
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
        force: import("@kbn/config-schema").Type<boolean>;
        upgrade_package_policies: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const BulkUninstallPackagesRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        packages: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            version: string;
        }>[]>;
        force: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const BulkRollbackPackagesRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        packages: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
        }>[]>;
    }>;
};
export declare const InstallPackageByUploadRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        ignoreMappingUpdateErrors: import("@kbn/config-schema").Type<boolean>;
        skipDataStreamRollover: import("@kbn/config-schema").Type<boolean>;
    }>;
    body: import("@kbn/config-schema").Type<Buffer<ArrayBufferLike>>;
};
export declare const CreateCustomIntegrationRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        integrationName: import("@kbn/config-schema").Type<string>;
        datasets: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            type: "synthetics" | "metrics" | "profiling" | "logs" | "traces";
        }>[]>;
        force: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const DeletePackageRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        force: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const DeletePackageWithoutVersionRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        force: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const InstallKibanaAssetsRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").Type<Readonly<{
        force?: boolean | undefined;
        space_ids?: string[] | undefined;
    } & {}> | null>;
};
export declare const InstallRuleAssetsRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").Type<Readonly<{
        force?: boolean | undefined;
    } & {}> | null>;
};
export declare const DeleteKibanaAssetsRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const DeletePackageDatastreamAssetsRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        packagePolicyId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const GetInputsRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
        pkgVersion: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        format: import("@kbn/config-schema").Type<"json" | "yaml" | "yml">;
        prerelease: import("@kbn/config-schema").Type<boolean | undefined>;
        ignoreUnverified: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const RollbackPackageRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
    }>;
};
