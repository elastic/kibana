export declare const EpmPackagesSchemaV6: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string>;
    internal: import("@kbn/config-schema").Type<boolean | undefined>;
    keep_policies_up_to_date: import("@kbn/config-schema").Type<boolean | undefined>;
    es_index_patterns: import("@kbn/config-schema").Type<any>;
    verification_status: import("@kbn/config-schema").Type<string>;
    verification_key_id: import("@kbn/config-schema").Type<string | undefined>;
    installed_es: import("@kbn/config-schema").Type<Readonly<{
        version?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: string;
    }>[] | undefined>;
    latest_install_failed_attempts: import("@kbn/config-schema").Type<any>;
    latest_executed_state: import("@kbn/config-schema").Type<any>;
    installed_kibana: import("@kbn/config-schema").Type<any>;
    installed_kibana_space_id: import("@kbn/config-schema").Type<string | undefined>;
    package_assets: import("@kbn/config-schema").Type<any>;
    additional_spaces_installed_kibana: import("@kbn/config-schema").Type<any>;
    install_started_at: import("@kbn/config-schema").Type<string>;
    install_version: import("@kbn/config-schema").Type<string>;
    install_status: import("@kbn/config-schema").Type<string>;
    install_source: import("@kbn/config-schema").Type<string>;
    install_format_schema_version: import("@kbn/config-schema").Type<string | undefined>;
    experimental_data_stream_features: import("@kbn/config-schema").Type<Readonly<{
        features?: Readonly<{
            synthetic_source?: boolean | undefined;
            tsdb?: boolean | undefined;
        } & {}>[] | undefined;
    } & {
        data_stream: string;
    }>[] | undefined>;
    previous_version: import("@kbn/config-schema").Type<string | undefined>;
    pending_upgrade_review: import("@kbn/config-schema").Type<any>;
}>;
export declare const EpmPackagesSchemaV7: import("@kbn/config-schema").ObjectType<Omit<{
    name: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string>;
    internal: import("@kbn/config-schema").Type<boolean | undefined>;
    keep_policies_up_to_date: import("@kbn/config-schema").Type<boolean | undefined>;
    es_index_patterns: import("@kbn/config-schema").Type<any>;
    verification_status: import("@kbn/config-schema").Type<string>;
    verification_key_id: import("@kbn/config-schema").Type<string | undefined>;
    installed_es: import("@kbn/config-schema").Type<Readonly<{
        version?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: string;
    }>[] | undefined>;
    latest_install_failed_attempts: import("@kbn/config-schema").Type<any>;
    latest_executed_state: import("@kbn/config-schema").Type<any>;
    installed_kibana: import("@kbn/config-schema").Type<any>;
    installed_kibana_space_id: import("@kbn/config-schema").Type<string | undefined>;
    package_assets: import("@kbn/config-schema").Type<any>;
    additional_spaces_installed_kibana: import("@kbn/config-schema").Type<any>;
    install_started_at: import("@kbn/config-schema").Type<string>;
    install_version: import("@kbn/config-schema").Type<string>;
    install_status: import("@kbn/config-schema").Type<string>;
    install_source: import("@kbn/config-schema").Type<string>;
    install_format_schema_version: import("@kbn/config-schema").Type<string | undefined>;
    experimental_data_stream_features: import("@kbn/config-schema").Type<Readonly<{
        features?: Readonly<{
            synthetic_source?: boolean | undefined;
            tsdb?: boolean | undefined;
        } & {}>[] | undefined;
    } & {
        data_stream: string;
    }>[] | undefined>;
    previous_version: import("@kbn/config-schema").Type<string | undefined>;
    pending_upgrade_review: import("@kbn/config-schema").Type<any>;
}, "dependencies"> & {
    dependencies: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        version: string;
    }>[] | undefined>;
}>;
export declare const EpmPackagesSchemaV8: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    name: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string>;
    internal: import("@kbn/config-schema").Type<boolean | undefined>;
    keep_policies_up_to_date: import("@kbn/config-schema").Type<boolean | undefined>;
    es_index_patterns: import("@kbn/config-schema").Type<any>;
    verification_status: import("@kbn/config-schema").Type<string>;
    verification_key_id: import("@kbn/config-schema").Type<string | undefined>;
    installed_es: import("@kbn/config-schema").Type<Readonly<{
        version?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: string;
    }>[] | undefined>;
    latest_install_failed_attempts: import("@kbn/config-schema").Type<any>;
    latest_executed_state: import("@kbn/config-schema").Type<any>;
    installed_kibana: import("@kbn/config-schema").Type<any>;
    installed_kibana_space_id: import("@kbn/config-schema").Type<string | undefined>;
    package_assets: import("@kbn/config-schema").Type<any>;
    additional_spaces_installed_kibana: import("@kbn/config-schema").Type<any>;
    install_started_at: import("@kbn/config-schema").Type<string>;
    install_version: import("@kbn/config-schema").Type<string>;
    install_status: import("@kbn/config-schema").Type<string>;
    install_source: import("@kbn/config-schema").Type<string>;
    install_format_schema_version: import("@kbn/config-schema").Type<string | undefined>;
    experimental_data_stream_features: import("@kbn/config-schema").Type<Readonly<{
        features?: Readonly<{
            synthetic_source?: boolean | undefined;
            tsdb?: boolean | undefined;
        } & {}>[] | undefined;
    } & {
        data_stream: string;
    }>[] | undefined>;
    previous_version: import("@kbn/config-schema").Type<string | undefined>;
    pending_upgrade_review: import("@kbn/config-schema").Type<any>;
}, "dependencies"> & {
    dependencies: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        version: string;
    }>[] | undefined>;
}, "is_dependency_of" | "installed_as_dependency"> & {
    is_dependency_of: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        version: string;
    }>[] | undefined>;
    installed_as_dependency: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const EpmPackagesSchemaV9: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
    name: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string>;
    internal: import("@kbn/config-schema").Type<boolean | undefined>;
    keep_policies_up_to_date: import("@kbn/config-schema").Type<boolean | undefined>;
    es_index_patterns: import("@kbn/config-schema").Type<any>;
    verification_status: import("@kbn/config-schema").Type<string>;
    verification_key_id: import("@kbn/config-schema").Type<string | undefined>;
    installed_es: import("@kbn/config-schema").Type<Readonly<{
        version?: string | undefined;
        deferred?: boolean | undefined;
    } & {
        id: string;
        type: string;
    }>[] | undefined>;
    latest_install_failed_attempts: import("@kbn/config-schema").Type<any>;
    latest_executed_state: import("@kbn/config-schema").Type<any>;
    installed_kibana: import("@kbn/config-schema").Type<any>;
    installed_kibana_space_id: import("@kbn/config-schema").Type<string | undefined>;
    package_assets: import("@kbn/config-schema").Type<any>;
    additional_spaces_installed_kibana: import("@kbn/config-schema").Type<any>;
    install_started_at: import("@kbn/config-schema").Type<string>;
    install_version: import("@kbn/config-schema").Type<string>;
    install_status: import("@kbn/config-schema").Type<string>;
    install_source: import("@kbn/config-schema").Type<string>;
    install_format_schema_version: import("@kbn/config-schema").Type<string | undefined>;
    experimental_data_stream_features: import("@kbn/config-schema").Type<Readonly<{
        features?: Readonly<{
            synthetic_source?: boolean | undefined;
            tsdb?: boolean | undefined;
        } & {}>[] | undefined;
    } & {
        data_stream: string;
    }>[] | undefined>;
    previous_version: import("@kbn/config-schema").Type<string | undefined>;
    pending_upgrade_review: import("@kbn/config-schema").Type<any>;
}, "dependencies"> & {
    dependencies: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        version: string;
    }>[] | undefined>;
}, "is_dependency_of" | "installed_as_dependency"> & {
    is_dependency_of: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        version: string;
    }>[] | undefined>;
    installed_as_dependency: import("@kbn/config-schema").Type<boolean | undefined>;
}, "namespace_customization_enabled_for" | "previous_dependency_versions"> & {
    namespace_customization_enabled_for: import("@kbn/config-schema").Type<string[] | undefined>;
    previous_dependency_versions: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        previousVersion: string | null;
    }>[] | null | undefined>;
}>;
