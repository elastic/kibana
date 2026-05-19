export declare const GetSettingsRequestSchema: {};
export declare const PutSettingsRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        has_seen_add_data_notice: import("@kbn/config-schema").Type<boolean | undefined>;
        additional_yaml_config: import("@kbn/config-schema").Type<string | undefined>;
        kibana_urls: import("@kbn/config-schema").Type<string[] | undefined>;
        kibana_ca_sha256: import("@kbn/config-schema").Type<string | undefined>;
        prerelease_integrations_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
        delete_unenrolled_agents: import("@kbn/config-schema").Type<Readonly<{} & {
            enabled: boolean;
            is_preconfigured: boolean;
        }> | undefined>;
        integration_knowledge_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const GetSpaceSettingsRequestSchema: {};
export declare const SpaceSettingsResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        managed_by: import("@kbn/config-schema").Type<string | undefined>;
        allowed_namespace_prefixes: import("@kbn/config-schema").Type<string[]>;
    }>;
}>;
export declare const SettingsSchemaV5: import("@kbn/config-schema").ObjectType<{
    has_seen_add_data_notice: import("@kbn/config-schema").Type<boolean | undefined>;
    prerelease_integrations_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string | undefined>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    preconfigured_fields: import("@kbn/config-schema").Type<"fleet_server_hosts"[] | undefined>;
    secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    output_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    action_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    use_space_awareness_migration_status: import("@kbn/config-schema").Type<"success" | "error" | "pending" | undefined>;
    use_space_awareness_migration_started_at: import("@kbn/config-schema").Type<string | null | undefined>;
    delete_unenrolled_agents: import("@kbn/config-schema").Type<Readonly<{} & {
        enabled: boolean;
        is_preconfigured: boolean;
    }> | undefined>;
    ilm_migration_status: import("@kbn/config-schema").Type<Readonly<{
        synthetics?: "success" | null | undefined;
        metrics?: "success" | null | undefined;
        logs?: "success" | null | undefined;
    } & {}> | undefined>;
}>;
export declare const SettingsSchemaV6: import("@kbn/config-schema").ObjectType<Omit<{
    has_seen_add_data_notice: import("@kbn/config-schema").Type<boolean | undefined>;
    prerelease_integrations_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string | undefined>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    preconfigured_fields: import("@kbn/config-schema").Type<"fleet_server_hosts"[] | undefined>;
    secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    output_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    action_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    use_space_awareness_migration_status: import("@kbn/config-schema").Type<"success" | "error" | "pending" | undefined>;
    use_space_awareness_migration_started_at: import("@kbn/config-schema").Type<string | null | undefined>;
    delete_unenrolled_agents: import("@kbn/config-schema").Type<Readonly<{} & {
        enabled: boolean;
        is_preconfigured: boolean;
    }> | undefined>;
    ilm_migration_status: import("@kbn/config-schema").Type<Readonly<{
        synthetics?: "success" | null | undefined;
        metrics?: "success" | null | undefined;
        logs?: "success" | null | undefined;
    } & {}> | undefined>;
}, "ssl_secret_storage_requirements_met"> & {
    ssl_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const SettingsSchemaV7: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    has_seen_add_data_notice: import("@kbn/config-schema").Type<boolean | undefined>;
    prerelease_integrations_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string | undefined>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    preconfigured_fields: import("@kbn/config-schema").Type<"fleet_server_hosts"[] | undefined>;
    secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    output_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    action_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    use_space_awareness_migration_status: import("@kbn/config-schema").Type<"success" | "error" | "pending" | undefined>;
    use_space_awareness_migration_started_at: import("@kbn/config-schema").Type<string | null | undefined>;
    delete_unenrolled_agents: import("@kbn/config-schema").Type<Readonly<{} & {
        enabled: boolean;
        is_preconfigured: boolean;
    }> | undefined>;
    ilm_migration_status: import("@kbn/config-schema").Type<Readonly<{
        synthetics?: "success" | null | undefined;
        metrics?: "success" | null | undefined;
        logs?: "success" | null | undefined;
    } & {}> | undefined>;
}, "ssl_secret_storage_requirements_met"> & {
    ssl_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
}, "integration_knowledge_enabled"> & {
    integration_knowledge_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const SettingsSchemaV8: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
    has_seen_add_data_notice: import("@kbn/config-schema").Type<boolean | undefined>;
    prerelease_integrations_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string | undefined>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    preconfigured_fields: import("@kbn/config-schema").Type<"fleet_server_hosts"[] | undefined>;
    secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    output_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    action_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    use_space_awareness_migration_status: import("@kbn/config-schema").Type<"success" | "error" | "pending" | undefined>;
    use_space_awareness_migration_started_at: import("@kbn/config-schema").Type<string | null | undefined>;
    delete_unenrolled_agents: import("@kbn/config-schema").Type<Readonly<{} & {
        enabled: boolean;
        is_preconfigured: boolean;
    }> | undefined>;
    ilm_migration_status: import("@kbn/config-schema").Type<Readonly<{
        synthetics?: "success" | null | undefined;
        metrics?: "success" | null | undefined;
        logs?: "success" | null | undefined;
    } & {}> | undefined>;
}, "ssl_secret_storage_requirements_met"> & {
    ssl_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
}, "integration_knowledge_enabled"> & {
    integration_knowledge_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
}, "download_source_auth_secret_storage_requirements_met"> & {
    download_source_auth_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const SettingsResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
        has_seen_add_data_notice: import("@kbn/config-schema").Type<boolean | undefined>;
        prerelease_integrations_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
        id: import("@kbn/config-schema").Type<string | undefined>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        preconfigured_fields: import("@kbn/config-schema").Type<"fleet_server_hosts"[] | undefined>;
        secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
        output_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
        action_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
        use_space_awareness_migration_status: import("@kbn/config-schema").Type<"success" | "error" | "pending" | undefined>;
        use_space_awareness_migration_started_at: import("@kbn/config-schema").Type<string | null | undefined>;
        delete_unenrolled_agents: import("@kbn/config-schema").Type<Readonly<{} & {
            enabled: boolean;
            is_preconfigured: boolean;
        }> | undefined>;
        ilm_migration_status: import("@kbn/config-schema").Type<Readonly<{
            synthetics?: "success" | null | undefined;
            metrics?: "success" | null | undefined;
            logs?: "success" | null | undefined;
        } & {}> | undefined>;
    }, "ssl_secret_storage_requirements_met"> & {
        ssl_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "integration_knowledge_enabled"> & {
        integration_knowledge_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "download_source_auth_secret_storage_requirements_met"> & {
        download_source_auth_secret_storage_requirements_met: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
}>;
export declare const PutSpaceSettingsRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        allowed_namespace_prefixes: import("@kbn/config-schema").Type<string[] | undefined>;
    }>;
};
export declare const GetEnrollmentSettingsRequestSchema: {
    query: import("@kbn/config-schema").Type<Readonly<{
        agentPolicyId?: string | undefined;
    } & {}> | undefined>;
};
export declare const GetEnrollmentSettingsResponseSchema: import("@kbn/config-schema").ObjectType<{
    fleet_server: import("@kbn/config-schema").ObjectType<{
        policies: import("@kbn/config-schema").Type<Readonly<{
            is_default_fleet_server?: boolean | undefined;
            has_fleet_server?: boolean | undefined;
        } & {
            name: string;
            id: string;
            is_managed: boolean;
        }>[]>;
        has_active: import("@kbn/config-schema").Type<boolean>;
        host: import("@kbn/config-schema").Type<Readonly<{
            ssl?: Readonly<{
                certificate?: string | undefined;
                certificate_authorities?: string[] | undefined;
                es_certificate_authorities?: string[] | undefined;
                es_certificate?: string | undefined;
                agent_certificate_authorities?: string[] | undefined;
                agent_certificate?: string | undefined;
                client_auth?: string | undefined;
            } & {}> | null | undefined;
            is_internal?: boolean | undefined;
            proxy_id?: string | null | undefined;
        } & {
            name: string;
            id: string;
            is_preconfigured: boolean;
            is_default: boolean;
            host_urls: string[];
        }> | undefined>;
        host_proxy: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            url: string;
        }> | undefined>;
        es_output: import("@kbn/config-schema").Type<Readonly<{
            hosts?: string[] | undefined;
            ssl?: Readonly<{
                certificate?: string | undefined;
                certificate_authorities?: string[] | undefined;
                verification_mode?: string | undefined;
            } & {}> | null | undefined;
            is_preconfigured?: boolean | undefined;
            preset?: "custom" | "scale" | "latency" | "throughput" | "balanced" | undefined;
            otel_exporter_config_yaml?: string | null | undefined;
            otel_disable_beatsauth?: boolean | null | undefined;
            is_internal?: boolean | undefined;
            ca_sha256?: string | null | undefined;
            ca_trusted_fingerprint?: string | null | undefined;
            config_yaml?: string | null | undefined;
            proxy_id?: string | null | undefined;
            allow_edit?: string[] | undefined;
            write_to_logs_streams?: boolean | null | undefined;
        } & {
            name: string;
            id: string;
            type: "elasticsearch";
            is_default: boolean;
            is_default_monitoring: boolean;
        }> | undefined>;
        es_output_proxy: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            url: string;
        }> | undefined>;
    }>;
    download_source: import("@kbn/config-schema").Type<Readonly<{
        auth?: Readonly<{
            headers?: Readonly<{} & {
                key: string;
                value: string;
            }>[] | undefined;
            username?: string | undefined;
        } & {}> | null | undefined;
        ssl?: Readonly<{
            certificate?: string | undefined;
            certificate_authorities?: string[] | undefined;
        } & {}> | undefined;
        proxy_id?: string | null | undefined;
    } & {
        name: string;
        id: string;
        host: string;
        is_default: boolean;
    }> | undefined>;
    download_source_proxy: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        url: string;
    }> | undefined>;
}>;
