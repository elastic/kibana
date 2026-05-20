export declare const INTERNAL_ROOT = "/internal/fleet";
export declare const API_ROOT = "/api/fleet";
export declare const EPM_API_ROOT = "/api/fleet/epm";
export declare const DATA_STREAM_API_ROOT = "/api/fleet/data_streams";
export declare const PACKAGE_POLICY_API_ROOT = "/api/fleet/package_policies";
export declare const AGENT_POLICY_API_ROOT = "/api/fleet/agent_policies";
export declare const CLOUD_CONNECTOR_API_ROOT = "/api/fleet/cloud_connectors";
export declare const K8S_API_ROOT = "/api/fleet/kubernetes";
export declare const DOWNLOAD_SOURCE_API_ROOT = "/api/fleet/agent_download_sources";
export declare const LIMITED_CONCURRENCY_ROUTE_TAG = "ingest:limited-concurrency";
export declare const EPM_API_ROUTES: {
    BULK_INSTALL_PATTERN: string;
    BULK_UPGRADE_PATTERN: string;
    BULK_UPGRADE_INFO_PATTERN: string;
    BULK_UNINSTALL_PATTERN: string;
    BULK_UNINSTALL_INFO_PATTERN: string;
    BULK_ROLLBACK_PATTERN: string;
    BULK_ROLLBACK_INFO_PATTERN: string;
    BULK_NAMESPACE_CUSTOMIZATION_PATTERN: string;
    LIST_PATTERN: string;
    INSTALLED_LIST_PATTERN: string;
    LIMITED_LIST_PATTERN: string;
    INFO_WITHOUT_VERSION_PATTERN: string;
    INFO_PATTERN: string;
    DATA_STREAMS_PATTERN: string;
    INSTALL_FROM_REGISTRY_WITHOUT_VERSION_PATTERN: string;
    INSTALL_FROM_REGISTRY_PATTERN: string;
    INSTALL_BY_UPLOAD_PATTERN: string;
    CUSTOM_INTEGRATIONS_PATTERN: string;
    UPDATE_CUSTOM_INTEGRATIONS_PATTERN: string;
    DELETE_WITHOUT_VERSION_PATTERN: string;
    DELETE_PATTERN: string;
    INSTALL_KIBANA_ASSETS_PATTERN: string;
    DELETE_KIBANA_ASSETS_PATTERN: string;
    INSTALL_RULE_ASSETS_PATTERN: string;
    FILEPATH_PATTERN: string;
    KNOWLEDGE_BASE_PATTERN: string;
    CATEGORIES_PATTERN: string;
    VERIFICATION_KEY_ID: string;
    STATS_PATTERN: string;
    DEPENDENCIES_PATTERN: string;
    BULK_ASSETS_PATTERN: string;
    INPUTS_PATTERN: string;
    PACKAGES_DATASTREAM_ASSETS: string;
    ROLLBACK_PATTERN: string;
    ROLLBACK_AVAILABLE_CHECK_PATTERN: string;
    BULK_ROLLBACK_AVAILABLE_CHECK_PATTERN: string;
    REAUTHORIZE_TRANSFORMS: string;
    REVIEW_UPGRADE_PATTERN: string;
};
export declare const DATA_STREAM_API_ROUTES: {
    LIST_PATTERN: string;
    DEPRECATED_ILM_CHECK_PATTERN: string;
};
export declare const PACKAGE_POLICY_API_ROUTES: {
    LIST_PATTERN: string;
    BULK_GET_PATTERN: string;
    INFO_PATTERN: string;
    CREATE_PATTERN: string;
    UPDATE_PATTERN: string;
    DELETE_PATTERN: string;
    UPGRADE_PATTERN: string;
    DRYRUN_PATTERN: string;
    ORPHANED_INTEGRATION_POLICIES: string;
};
export declare const AGENT_POLICY_API_ROUTES: {
    LIST_PATTERN: string;
    BULK_GET_PATTERN: string;
    INFO_PATTERN: string;
    CREATE_PATTERN: string;
    UPDATE_PATTERN: string;
    COPY_PATTERN: string;
    DELETE_PATTERN: string;
    FULL_INFO_PATTERN: string;
    FULL_INFO_DOWNLOAD_PATTERN: string;
    LIST_OUTPUTS_PATTERN: string;
    INFO_OUTPUTS_PATTERN: string;
    AUTO_UPGRADE_AGENTS_STATUS_PATTERN: string;
    CREATE_WITH_PACKAGE_POLICIES: string;
    CLEANUP_REVISIONS_PATTERN: string;
};
export declare const CLOUD_CONNECTOR_API_ROUTES: {
    LIST_PATTERN: string;
    INFO_PATTERN: string;
    CREATE_PATTERN: string;
    UPDATE_PATTERN: string;
    DELETE_PATTERN: string;
    USAGE_PATTERN: string;
};
export declare const K8S_API_ROUTES: {
    K8S_DOWNLOAD_PATTERN: string;
    K8S_INFO_PATTERN: string;
};
export declare const OUTPUT_API_ROUTES: {
    LIST_PATTERN: string;
    INFO_PATTERN: string;
    UPDATE_PATTERN: string;
    DELETE_PATTERN: string;
    CREATE_PATTERN: string;
    GET_OUTPUT_HEALTH_PATTERN: string;
    LOGSTASH_API_KEY_PATTERN: string;
};
export declare const FLEET_SERVER_HOST_API_ROUTES: {
    LIST_PATTERN: string;
    CREATE_PATTERN: string;
    INFO_PATTERN: string;
    UPDATE_PATTERN: string;
    DELETE_PATTERN: string;
    POLICY_STATUS_PATTERN: string;
};
export declare const FLEET_PROXY_API_ROUTES: {
    LIST_PATTERN: string;
    CREATE_PATTERN: string;
    INFO_PATTERN: string;
    UPDATE_PATTERN: string;
    DELETE_PATTERN: string;
};
export declare const SETTINGS_API_ROUTES: {
    INFO_PATTERN: string;
    UPDATE_PATTERN: string;
    ENROLLMENT_INFO_PATTERN: string;
    SPACE_INFO_PATTERN: string;
    SPACE_UPDATE_PATTERN: string;
};
export declare const APP_API_ROUTES: {
    HEALTH_CHECK_PATTERN: string;
    CHECK_PERMISSIONS_PATTERN: string;
    GENERATE_SERVICE_TOKEN_PATTERN: string;
    AGENT_POLICIES_SPACES: string;
    SPACE_AWARENESS_MIGRATION: string;
};
export declare const AGENT_API_ROUTES: {
    LIST_PATTERN: string;
    INFO_PATTERN: string;
    UPDATE_PATTERN: string;
    EFFECTIVE_CONFIG_PATTERN: string;
    BULK_UPDATE_AGENT_TAGS_PATTERN: string;
    DELETE_PATTERN: string;
    CHECKIN_PATTERN: string;
    ACKS_PATTERN: string;
    ACTIONS_PATTERN: string;
    MIGRATE_PATTERN: string;
    BULK_MIGRATE_PATTERN: string;
    CANCEL_ACTIONS_PATTERN: string;
    UNENROLL_PATTERN: string;
    BULK_UNENROLL_PATTERN: string;
    REMOVE_COLLECTOR_PATTERN: string;
    BULK_REMOVE_COLLECTORS_PATTERN: string;
    REASSIGN_PATTERN: string;
    BULK_REASSIGN_PATTERN: string;
    REQUEST_DIAGNOSTICS_PATTERN: string;
    BULK_REQUEST_DIAGNOSTICS_PATTERN: string;
    AVAILABLE_VERSIONS_PATTERN: string;
    STATUS_PATTERN: string;
    DATA_PATTERN: string;
    UPGRADE_PATTERN: string;
    BULK_UPGRADE_PATTERN: string;
    ACTION_STATUS_PATTERN: string;
    LIST_TAGS_PATTERN: string;
    LIST_UPLOADS_PATTERN: string;
    GET_UPLOAD_FILE_PATTERN: string;
    DELETE_UPLOAD_FILE_PATTERN: string;
    PRIVILEGE_LEVEL_CHANGE_PATTERN: string;
    BULK_PRIVILEGE_LEVEL_CHANGE_PATTERN: string;
    ROLLBACK_PATTERN: string;
    BULK_ROLLBACK_PATTERN: string;
    GENERATE_REPORT_PATTERN: string;
};
export declare const AGENTLESS_POLICIES_ROUTES: {
    CREATE_PATTERN: string;
    DELETE_PATTERN: string;
    SYNC_PATTERN: string;
};
export declare const ENROLLMENT_API_KEY_ROUTES: {
    CREATE_PATTERN: string;
    LIST_PATTERN: string;
    INFO_PATTERN: string;
    DELETE_PATTERN: string;
    BULK_DELETE_PATTERN: string;
};
export declare const UNINSTALL_TOKEN_ROUTES: {
    LIST_PATTERN: string;
    INFO_PATTERN: string;
};
export declare const AGENTS_SETUP_API_ROUTES: {
    INFO_PATTERN: string;
    CREATE_PATTERN: string;
};
export declare const MESSAGE_SIGNING_SERVICE_API_ROUTES: {
    ROTATE_KEY_PAIR: string;
};
export declare const SETUP_API_ROUTE = "/api/fleet/setup";
export declare const INSTALL_SCRIPT_API_ROUTES = "/api/fleet/install/{osType}";
export declare const PRECONFIGURATION_API_ROUTES: {
    RESET_PATTERN: string;
    RESET_ONE_PATTERN: string;
};
export declare const DOWNLOAD_SOURCE_API_ROUTES: {
    LIST_PATTERN: string;
    INFO_PATTERN: string;
    CREATE_PATTERN: string;
    UPDATE_PATTERN: string;
    DELETE_PATTERN: string;
};
export declare const REMOTE_SYNCED_INTEGRATIONS_API_ROUTES: {
    STATUS_PATTERN: string;
    INFO_PATTERN: string;
};
export declare const CREATE_STANDALONE_AGENT_API_KEY_ROUTE = "/internal/fleet/create_standalone_agent_api_key";
export declare const FLEET_DEBUG_ROUTES: {
    INDEX_PATTERN: string;
    SAVED_OBJECTS_PATTERN: string;
    SAVED_OBJECT_NAMES_PATTERN: string;
};
export declare const API_VERSIONS: {
    public: {
        v1: string;
    };
    internal: {
        v1: string;
    };
};
export declare const PUBLIC_API_ACCESS = "public";
export declare const INTERNAL_API_ACCESS = "internal";
