export type StaticPage = 'base' | 'overview' | 'integrations' | 'integration_create' | 'policies' | 'policies_list' | 'enrollment_tokens' | 'uninstall_tokens' | 'data_streams' | 'settings' | 'collectors' | 'settings_create_outputs' | 'settings_create_download_sources' | 'settings_create_fleet_server_hosts' | 'settings_create_fleet_proxy' | 'debug';
export type DynamicPage = 'integrations_all' | 'integrations_installed' | 'integrations_installed_updates_available' | 'integration_details_overview' | 'integration_details_policies' | 'integration_details_assets' | 'integration_details_alerting' | 'integration_details_settings' | 'integration_details_custom' | 'integration_details_language_clients' | 'integration_details_api_reference' | 'integration_details_configs' | 'integration_policy_edit' | 'integration_policy_copy' | 'integration_policy_upgrade' | 'integration_policy_edit_from_installed' | 'integration_policy_copy_from_installed' | 'policy_details' | 'add_integration_to_policy' | 'edit_integration' | 'copy_integration' | 'upgrade_package_policy' | 'agent_list' | 'agent_details' | 'agent_details_logs' | 'agent_details_settings' | 'agent_details_diagnostics' | 'agent_details_collector_config' | 'settings_edit_outputs' | 'settings_edit_download_sources' | 'settings_edit_fleet_server_hosts' | 'settings_edit_fleet_proxy';
export type Page = StaticPage | DynamicPage;
export interface DynamicPagePathValues {
    [key: string]: string | boolean;
}
export declare const FLEET_BASE_PATH = "/app/fleet";
export declare const INTEGRATIONS_BASE_PATH = "/app/integrations";
export declare const FLEET_ROUTING_PATHS: {
    fleet: string;
    agents: string;
    agent_details: string;
    agent_details_logs: string;
    agent_details_diagnostics: string;
    agent_details_settings: string;
    agent_details_collector_config: string;
    policies: string;
    policies_list: string;
    policy_details: string;
    policy_details_settings: string;
    edit_integration: string;
    copy_integration: string;
    upgrade_package_policy: string;
    enrollment_tokens: string;
    uninstall_tokens: string;
    data_streams: string;
    collectors: string;
    settings: string;
    settings_create_fleet_server_hosts: string;
    settings_edit_fleet_server_hosts: string;
    settings_create_outputs: string;
    settings_edit_outputs: string;
    settings_create_download_sources: string;
    settings_create_fleet_proxy: string;
    settings_edit_fleet_proxy: string;
    settings_edit_download_sources: string;
    debug: string;
    add_integration_to_policy: string;
};
export declare const INTEGRATIONS_SEARCH_QUERYPARAM = "q";
export declare const INTEGRATIONS_ONLY_AGENTLESS_QUERYPARAM = "onlyAgentless";
export declare const INTEGRATIONS_SHOW_DEPRECATED_QUERYPARAM = "showDeprecated";
export declare const INTEGRATIONS_ROUTING_PATHS: {
    integrations: string;
    integrations_all: string;
    integrations_installed: string;
    integrations_installed_updates_available: string;
    integrations_create: string;
    integrations_upload: string;
    integration_details: string;
    integration_details_overview: string;
    integration_details_policies: string;
    integration_details_assets: string;
    integration_details_alerting: string;
    integration_details_settings: string;
    integration_details_configs: string;
    integration_details_custom: string;
    integration_details_api_reference: string;
    integration_details_language_clients: string;
    integration_policy_edit: string;
    integration_policy_copy: string;
    integration_policy_upgrade: string;
};
export declare const pagePathGetters: {
    [key in StaticPage]: () => [string, string];
} & {
    [key in DynamicPage]: (values: DynamicPagePathValues) => [string, string];
};
