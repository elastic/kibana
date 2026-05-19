export declare const AgentPolicyNamespaceSchema: import("@kbn/config-schema").Type<string>;
export declare const AgentPolicyBaseSchema: {
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
};
export declare const AgentPolicySchemaV3: import("@kbn/config-schema").ObjectType<Omit<{
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
}>;
export declare const AgentPolicySchemaV4: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
}>;
export declare const AgentPolicySchemaV5: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
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
}>;
export declare const AgentPolicySchemaV6: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<{
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
}>;
export declare const NewAgentPolicySchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<Omit<{
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
export declare const AgentPolicySchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<Omit<{
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
}, "id" | "status" | "updated_at" | "updated_by" | "is_managed" | "package_policies"> & {
    id: import("@kbn/config-schema").Type<string>;
    status: import("@kbn/config-schema").Type<"active" | "inactive">;
    updated_at: import("@kbn/config-schema").Type<string>;
    updated_by: import("@kbn/config-schema").Type<string>;
    is_managed: import("@kbn/config-schema").Type<boolean | undefined>;
    package_policies: import("@kbn/config-schema").Type<string[] | Readonly<{
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
        overrides?: Readonly<{
            inputs?: Record<string, any> | undefined;
        } & {}> | null | undefined;
        condition?: string | undefined;
        policy_id?: string | null | undefined;
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
        inputs: Readonly<{
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
        }>[];
    }>[] | undefined>;
}>;
export declare const AgentPolicyResponseSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<Omit<Omit<{
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
}, "id" | "status" | "updated_at" | "updated_by" | "is_managed" | "package_policies"> & {
    id: import("@kbn/config-schema").Type<string>;
    status: import("@kbn/config-schema").Type<"active" | "inactive">;
    updated_at: import("@kbn/config-schema").Type<string>;
    updated_by: import("@kbn/config-schema").Type<string>;
    is_managed: import("@kbn/config-schema").Type<boolean | undefined>;
    package_policies: import("@kbn/config-schema").Type<string[] | Readonly<{
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
        overrides?: Readonly<{
            inputs?: Record<string, any> | undefined;
        } & {}> | null | undefined;
        condition?: string | undefined;
        policy_id?: string | null | undefined;
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
        inputs: Readonly<{
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
        }>[];
    }>[] | undefined>;
}, "version" | "agents" | "created_at" | "revision" | "is_preconfigured" | "schema_version" | "is_protected" | "package_policies" | "unprivileged_agents" | "fips_agents" | "agents_per_version" | "min_agent_version" | "package_agent_version_conditions"> & {
    version: import("@kbn/config-schema").Type<string | undefined>;
    agents: import("@kbn/config-schema").Type<number | undefined>;
    created_at: import("@kbn/config-schema").Type<string | undefined>;
    revision: import("@kbn/config-schema").Type<number>;
    is_preconfigured: import("@kbn/config-schema").Type<boolean | undefined>;
    schema_version: import("@kbn/config-schema").Type<string | undefined>;
    is_protected: import("@kbn/config-schema").Type<boolean>;
    package_policies: import("@kbn/config-schema").Type<string[] | Readonly<{
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
    }>[] | undefined>;
    unprivileged_agents: import("@kbn/config-schema").Type<number | undefined>;
    fips_agents: import("@kbn/config-schema").Type<number | undefined>;
    agents_per_version: import("@kbn/config-schema").Type<Readonly<{} & {
        count: number;
        version: string;
    }>[] | undefined>;
    min_agent_version: import("@kbn/config-schema").Type<string | null | undefined>;
    package_agent_version_conditions: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        title: string;
        version_condition: string;
    }>[] | null | undefined>;
}>;
export declare const GetAgentPolicyResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<Omit<Omit<{
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
    }, "id" | "status" | "updated_at" | "updated_by" | "is_managed" | "package_policies"> & {
        id: import("@kbn/config-schema").Type<string>;
        status: import("@kbn/config-schema").Type<"active" | "inactive">;
        updated_at: import("@kbn/config-schema").Type<string>;
        updated_by: import("@kbn/config-schema").Type<string>;
        is_managed: import("@kbn/config-schema").Type<boolean | undefined>;
        package_policies: import("@kbn/config-schema").Type<string[] | Readonly<{
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
            overrides?: Readonly<{
                inputs?: Record<string, any> | undefined;
            } & {}> | null | undefined;
            condition?: string | undefined;
            policy_id?: string | null | undefined;
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
            inputs: Readonly<{
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
            }>[];
        }>[] | undefined>;
    }, "version" | "agents" | "created_at" | "revision" | "is_preconfigured" | "schema_version" | "is_protected" | "package_policies" | "unprivileged_agents" | "fips_agents" | "agents_per_version" | "min_agent_version" | "package_agent_version_conditions"> & {
        version: import("@kbn/config-schema").Type<string | undefined>;
        agents: import("@kbn/config-schema").Type<number | undefined>;
        created_at: import("@kbn/config-schema").Type<string | undefined>;
        revision: import("@kbn/config-schema").Type<number>;
        is_preconfigured: import("@kbn/config-schema").Type<boolean | undefined>;
        schema_version: import("@kbn/config-schema").Type<string | undefined>;
        is_protected: import("@kbn/config-schema").Type<boolean>;
        package_policies: import("@kbn/config-schema").Type<string[] | Readonly<{
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
        }>[] | undefined>;
        unprivileged_agents: import("@kbn/config-schema").Type<number | undefined>;
        fips_agents: import("@kbn/config-schema").Type<number | undefined>;
        agents_per_version: import("@kbn/config-schema").Type<Readonly<{} & {
            count: number;
            version: string;
        }>[] | undefined>;
        min_agent_version: import("@kbn/config-schema").Type<string | null | undefined>;
        package_agent_version_conditions: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            title: string;
            version_condition: string;
        }>[] | null | undefined>;
    }>;
}>;
export declare const OTelCollectorPipelineIDSchema: import("@kbn/config-schema").Type<string>;
export declare const OTelCollectorPipelineSchema: import("@kbn/config-schema").Type<Readonly<{
    exporters?: string[] | undefined;
    processors?: string[] | undefined;
    receivers?: string[] | undefined;
} & {}> | undefined>;
export declare const OtelCollectorConfigSchema: {
    extensions: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    receivers: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    processors: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    connectors: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    exporters: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    service: import("@kbn/config-schema").Type<Readonly<{
        pipelines?: Record<string, Readonly<{
            exporters?: string[] | undefined;
            processors?: string[] | undefined;
            receivers?: string[] | undefined;
        } & {}> | undefined> | undefined;
        extensions?: string[] | undefined;
    } & {}> | undefined>;
};
export declare const FullAgentPolicyResponseSchema: import("@kbn/config-schema").ObjectType<{
    extensions: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    receivers: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    processors: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    connectors: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    exporters: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    service: import("@kbn/config-schema").Type<Readonly<{
        pipelines?: Record<string, Readonly<{
            exporters?: string[] | undefined;
            processors?: string[] | undefined;
            receivers?: string[] | undefined;
        } & {}> | undefined> | undefined;
        extensions?: string[] | undefined;
    } & {}> | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    outputs: import("@kbn/config-schema").Type<Record<string, Readonly<{
        hosts?: string[] | undefined;
        ca_sha256?: string | null | undefined;
        proxy_url?: string | undefined;
        proxy_headers?: Record<string, string | number | boolean> | null | undefined;
    } & {
        type: string;
    }>>>;
    output_permissions: import("@kbn/config-schema").Type<Record<string, Record<string, any>> | undefined>;
    fleet: import("@kbn/config-schema").Type<Readonly<{
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
    }> | undefined>;
    inputs: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
    revision: import("@kbn/config-schema").Type<number | undefined>;
    agent: import("@kbn/config-schema").Type<Readonly<{
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
    }> | undefined>;
    secret_references: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
    }>[] | undefined>;
    signed: import("@kbn/config-schema").Type<Readonly<{} & {
        data: string;
        signature: string;
    }> | undefined>;
}>;
export declare const GetAgentPolicyOutputsResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        agentPolicyId: import("@kbn/config-schema").Type<string | undefined>;
        monitoring: import("@kbn/config-schema").ObjectType<{
            output: import("@kbn/config-schema").ObjectType<{
                id: import("@kbn/config-schema").Type<string>;
                name: import("@kbn/config-schema").Type<string>;
            }>;
        }>;
        data: import("@kbn/config-schema").ObjectType<{
            output: import("@kbn/config-schema").ObjectType<{
                id: import("@kbn/config-schema").Type<string>;
                name: import("@kbn/config-schema").Type<string>;
            }>;
            integrations: import("@kbn/config-schema").Type<Readonly<{
                name?: string | undefined;
                id?: string | undefined;
                pkgName?: string | undefined;
                integrationPolicyName?: string | undefined;
            } & {}>[] | undefined>;
        }>;
    }>;
}>;
export declare const GetListAgentPolicyOutputsResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        agentPolicyId?: string | undefined;
    } & {
        data: Readonly<{
            integrations?: Readonly<{
                name?: string | undefined;
                id?: string | undefined;
                pkgName?: string | undefined;
                integrationPolicyName?: string | undefined;
            } & {}>[] | undefined;
        } & {
            output: Readonly<{} & {
                name: string;
                id: string;
            }>;
        }>;
        monitoring: Readonly<{} & {
            output: Readonly<{} & {
                name: string;
                id: string;
            }>;
        }>;
    }>[]>;
}>;
