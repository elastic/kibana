/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ADD_AGENT_BUTTON = 'addAgentButton';
export const ADD_AGENT_BUTTON_TOP = 'addAgentBtnTop';
export const LANDING_PAGE_ADD_FLEET_SERVER_BUTTON = 'fleetServerLanding.addFleetServerButton';

export const AGENTS_TAB = 'fleet-agents-tab';
export const AGENT_POLICIES_TAB = 'fleet-agent-policies-tab';
export const ENROLLMENT_TOKENS_TAB = 'fleet-enrollment-tokens-tab';
export const UNINSTALL_TOKENS_TAB = 'fleet-uninstall-tokens-tab';
export const DATA_STREAMS_TAB = 'fleet-datastreams-tab';
export const SETTINGS_TAB = 'fleet-settings-tab';

export const MISSING_PRIVILEGES = {
  PROMPT: 'missingPrivilegesPrompt',
  TITLE: 'missingPrivilegesPromptTitle',
  MESSAGE: 'missingPrivilegesPromptMessage',
};

export const FLEET_SERVER_MISSING_PRIVILEGES = {
  PROMPT: 'fleetServerMissingPrivilegesPrompt',
  MESSAGE: 'fleetServerMissingPrivilegesMessage',
  TITLE: 'fleetServerMissingPrivilegesTitle',
};

export const AGENT_POLICY_SAVE_INTEGRATION = 'saveIntegration';
export const PACKAGE_POLICY_TABLE_LINK = 'PackagePoliciesTableLink';
export const ADD_PACKAGE_POLICY_BTN = 'addPackagePolicyButton';
export const GENERATE_FLEET_SERVER_POLICY_BUTTON = 'generateFleetServerPolicyButton';
export const ADD_FLEET_SERVER_HEADER = 'addFleetServerHeader';
export const ADD_AGENT_POLICY_BTN = 'createAgentPolicyButton';

export const PLATFORM_TYPE_LINUX_BUTTON = 'platformTypeLinux';
export const ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON = 'fleetServerAddHostBtn';
export const ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON =
  'fleetServerGenerateServiceTokenBtn';

export const CREATE_FLEET_SERVER_POLICY_BTN = 'createFleetServerPolicyBtn';

export const AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD = 'createAgentPolicyNameField';
export const AGENT_POLICIES_FLYOUT_ADVANCED_DEFAULT_NAMESPACE_HEADER = 'defaultNamespaceHeader';
export const AGENT_POLICY_FLYOUT_CREATE_BUTTON = 'createAgentPolicyFlyoutBtn';

export const AGENT_POLICIES_TABLE = 'agentPoliciesTable';

export const ENROLLMENT_TOKENS = {
  CREATE_TOKEN_BUTTON: 'createEnrollmentTokenButton',
  CREATE_TOKEN_MODAL_NAME_FIELD: 'createEnrollmentTokenNameField',
  CREATE_TOKEN_MODAL_SELECT_FIELD: 'createEnrollmentTokenSelectField',
  LIST_TABLE: 'enrollmentTokenListTable',
  TABLE_REVOKE_BTN: 'enrollmentTokenTable.revokeBtn',
};

export const UNINSTALL_TOKENS = {
  POLICY_ID_SEARCH_FIELD: 'uninstallTokensPolicyIdSearchInput',
  POLICY_ID_TABLE_FIELD: 'uninstallTokensPolicyIdField',
  VIEW_UNINSTALL_COMMAND_BUTTON: 'uninstallTokensViewCommandButton',
  UNINSTALL_COMMAND_FLYOUT: 'uninstall-command-flyout',
  TOKEN_FIELD: 'apiKeyField',
  SHOW_HIDE_TOKEN_BUTTON: 'showHideTokenButton',
};

export const SETTINGS_FLEET_SERVER_HOST_HEADING = 'fleetServerHostHeader';
export const SETTINGS_SAVE_BTN = 'saveApplySettingsBtn';
export const SETTINGS_CONFIRM_MODAL_BTN = 'confirmModalConfirmButton';

export const AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX = 'agentPolicyFormSystemMonitoringCheckbox';
export const INSTALL_INTEGRATIONS_ADVANCE_OPTIONS_BTN = 'AgentPolicyAdvancedOptions.AccordionBtn';
export const AGENT_POLICY_CREATE_STATUS_CALLOUT = 'agentPolicyCreateStatusCallOut';

export const EXISTING_HOSTS_TAB = 'existingHostsTab';
export const NEW_HOSTS_TAB = 'newHostsTab';

export const CURRENT_BULK_UPGRADES_CALLOUT = {
  ABORT_BTN: 'currentBulkUpgrade.abortBtn',
};

export const AGENT_FLYOUT = {
  CREATE_POLICY_BUTTON: 'createPolicyBtn',
  CLOSE_BUTTON: 'euiFlyoutCloseButton',
  POLICY_DROPDOWN: 'agentPolicyDropdown',
  QUICK_START_TAB_BUTTON: 'fleetServerFlyoutTab-quickStart',
  ADVANCED_TAB_BUTTON: 'fleetServerFlyoutTab-advanced',
  AGENT_POLICY_CODE_BLOCK: 'agentPolicyCodeBlock',
  STANDALONE_TAB: 'standaloneTab',
  MANAGED_TAB: 'managedTab',
  CONFIRM_AGENT_ENROLLMENT_BUTTON: 'ConfirmAgentEnrollmentButton',
  INCOMING_DATA_CONFIRMED_CALL_OUT: 'IncomingDataConfirmedCallOut',
  PLATFORM_SELECTOR_EXTENDED: 'platformSelectorExtended',
  KUBERNETES_PLATFORM_TYPE: 'platformTypeKubernetes',
};

export const AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT = {
  TITLE: 'createAgentPolicyFlyoutTitle',
  CREATE_BUTTON: 'createAgentPolicyButton',
  ADVANCED_OPTIONS_TOGGLE: 'advancedOptionsButton',
  COLLECT_LOGS_CHECKBOX: 'collectLogsCheckbox',
  COLLECT_METRICS_CHECKBOX: 'collectMetricsCheckbox',
};

export const AGENT_BINARY_SOURCES_TABLE = 'AgentDownloadSourcesTable';
export const AGENT_BINARY_SOURCES_TABLE_ACTIONS = {
  DEFAULT_VALUE: 'editDownloadSourceTable.defaultIcon',
  HOST: 'editDownloadSourceTable.host',
  ADD: 'addDownloadSourcesBtn',
  EDIT: 'editDownloadSourceTable.edit.btn',
  DELETE: 'editDownloadSourceTable.delete.btn',
  DEFAULT_ICON: 'editDownloadSourceTable.defaultIcon',
  HOST_NAME: 'editDownloadSourceTable.host',
};
export const AGENT_BINARY_SOURCES_FLYOUT = {
  NAME_INPUT: 'editDownloadSourcesFlyout.nameInput',
  HOST_INPUT: 'editDownloadSourcesFlyout.hostInput',
  IS_DEFAULT_SWITCH: 'editDownloadSourcesFlyout.isDefaultSwitch',
  SUBMIT_BUTTON: 'editDownloadSourcesFlyout.submitBtn',
  CANCEL_BUTTON: 'editDownloadSourcesFlyout.cancelBtn',
};

export const SETTINGS_OUTPUTS = {
  EDIT_BTN: 'editOutputBtn',
  ADD_BTN: 'addOutputBtn',
  TABLE: 'settingsOutputsTable',
  NAME_INPUT: 'settingsOutputsFlyout.nameInput',
  TYPE_INPUT: 'settingsOutputsFlyout.typeInput',
  ADD_HOST_ROW_BTN: 'fleetServerHosts.multiRowInput.addRowButton',
  WARNING_ELASTICSEARCH_CALLOUT: 'settingsOutputsFlyout.elasticsearchOutputTypeCallout',
  PRESET_INPUT: 'settingsOutputsFlyout.presetInput',
};

export const getSpecificSelectorId = (selector: string, id: number) => {
  const lastChar = selector.charAt(selector.length - 1);

  if (!isNaN(Number(lastChar))) {
    return selector.slice(0, selector.length - 1) + id;
  }

  return selector;
};

export const SETTINGS_OUTPUTS_KAFKA = {
  VERSION_SELECT: 'settingsOutputsFlyout.kafkaVersionInput',
  AUTHENTICATION_SELECT: 'settingsOutputsFlyout.kafkaAuthenticationRadioInput',
  AUTHENTICATION_NONE_OPTION: 'kafkaAuthenticationNoneRadioButton',
  AUTHENTICATION_USERNAME_PASSWORD_OPTION: 'kafkaAuthenticationUsernamePasswordRadioButton',
  AUTHENTICATION_SSL_OPTION: 'kafkaAuthenticationSSLRadioButton',
  AUTHENTICATION_KERBEROS_OPTION: 'kafkaAuthenticationKerberosRadioButton',
  AUTHENTICATION_USERNAME_INPUT: 'settingsOutputsFlyout.kafkaUsernameInput',
  AUTHENTICATION_PASSWORD_INPUT: 'settingsOutputsFlyout.kafkaPasswordSecretInput',
  AUTHENTICATION_VERIFICATION_MODE_INPUT: 'settingsOutputsFlyout.kafkaVerificationModeInput',
  AUTHENTICATION_CONNECTION_TYPE_SELECT: 'settingsOutputsFlyout.kafkaConnectionTypeRadioInput',
  AUTHENTICATION_CONNECTION_TYPE_PLAIN_OPTION: 'kafkaConnectionTypePlaintextRadioButton',
  AUTHENTICATION_CONNECTION_TYPE_ENCRYPTION_OPTION: 'kafkaConnectionTypeEncryptionRadioButton',
  AUTHENTICATION_SASL_SELECT: 'settingsOutputsFlyout.kafkaSaslInput',
  AUTHENTICATION_SASL_PLAIN_OPTION: 'kafkaSaslPlainRadioButton',
  AUTHENTICATION_SASL_SCRAM_256_OPTION: 'kafkaSaslScramSha256RadioButton',
  AUTHENTICATION_SASL_SCRAM_512_OPTION: 'kafkaSaslScramSha512RadioButton',
  PARTITIONING_PANEL: 'settingsOutputsFlyout.kafkaPartitionPanel',
  PARTITIONING_SELECT: 'settingsOutputsFlyout.kafkaPartitioningRadioInput',
  PARTITIONING_RANDOM_OPTION: 'kafkaPartitionRandomRadioButton',
  PARTITIONING_HASH_OPTION: 'kafkaPartitionHashRadioButton',
  PARTITIONING_ROUND_ROBIN_OPTION: 'kafkaPartitionRoundRobinRadioButton',
  PARTITIONING_EVENTS_INPUT: 'settingsOutputsFlyout.kafkaPartitionTypeRandomInput',
  PARTITIONING_HASH_INPUT: 'settingsOutputsFlyout.kafkaPartitionTypeHashInput',
  TOPICS_PANEL: 'settingsOutputsFlyout.kafkaTopicsPanel',
  TOPICS_DEFAULT_TOPIC_INPUT: 'settingsOutputsFlyout.kafkaStaticTopicInput',
  TOPICS_DYNAMIC_TOPIC_INPUT: 'settingsOutputsFlyout.kafkaDynamicTopicInput',
  HEADERS_PANEL: 'settingsOutputsFlyout.kafkaHeadersPanel',
  HEADERS_KEY_INPUT: 'settingsOutputsFlyout.kafkaHeadersKeyInput0',
  HEADERS_VALUE_INPUT: 'settingsOutputsFlyout.kafkaHeadersValueInput0',
  HEADERS_ADD_ROW_BUTTON: 'kafkaHeaders.multiRowInput.addRowButton',
  HEADERS_REMOVE_ROW_BUTTON: 'settingsOutputsFlyout.kafkaHeadersDeleteButton0',
  HEADERS_CLIENT_ID_INPUT: 'settingsOutputsFlyout.kafkaClientIdInput',
  COMPRESSION_PANEL: 'settingsOutputsFlyout.kafkaCompressionPanel',
  COMPRESSION_SWITCH: 'settingsOutputsFlyout.kafkaCompressionSwitch',
  COMPRESSION_CODEC_INPUT: 'settingsOutputsFlyout.kafkaCompressionCodecInput',
  COMPRESSION_LEVEL_INPUT: 'settingsOutputsFlyout.kafkaCompressionLevelInput',
  BROKER_PANEL: 'settingsOutputsFlyout.kafkaBrokerSettingsPanel',
  BROKER_TIMEOUT_SELECT: 'settingsOutputsFlyout.kafkaBrokerTimeoutInput',
  BROKER_REACHABILITY_TIMEOUT_SELECT: 'settingsOutputsFlyout.kafkaBrokerReachabilityTimeoutInput',
  BROKER_ACK_RELIABILITY_SELECT: 'settingsOutputsFlyout.kafkaBrokerAckReliabilityInputLabel',
  KEY_INPUT: 'settingsOutputsFlyout.kafkaKeyInput',
};

export const SETTINGS_FLEET_SERVER_HOSTS = {
  ADD_BUTTON: 'settings.fleetServerHosts.addFleetServerHostBtn',
  EDIT_BUTTON: 'fleetServerHostsTable.edit.btn',
  TABLE: 'settingsFleetServerHostsTable',
};

export const AGENT_POLICY_FORM = {
  DOWNLOAD_SOURCE_SELECT: 'agentPolicyForm.downloadSource.select',
};

export const FLEET_AGENT_LIST_PAGE = {
  TABLE: 'fleetAgentListTable',
  STATUS_FILTER: 'agentList.statusFilter',
  TAGS_FILTER: 'agentList.tagsFilter',
  POLICY_FILTER: 'agentList.policyFilter',
  QUERY_INPUT: 'agentList.queryInput',
  SHOW_UPGRADEABLE: 'agentList.showUpgradeable',
  CHECKBOX_SELECT_ALL: 'checkboxSelectAll',
  BULK_ACTIONS_BUTTON: 'agentBulkActionsButton',
  ACTIVITY_BUTTON: 'agentActivityButton',
  ACTIVITY_FLYOUT: {
    FLYOUT_ID: 'agentActivityFlyout',
    CLOSE_BUTTON: 'euiFlyoutCloseButton',
  },
  BULK_ACTIONS: {
    ADD_REMOVE_TAG_INPUT: 'addRemoveTags',
  },
};

export const ASSETS_PAGE = {
  TAB: 'tab-assets',
  getButtonId(type: string) {
    return `fleetAssetsAccordion.button.${type}`;
  },
  getContentId(type: string, id?: string | number) {
    return `fleetAssetsAccordion.content.${type}${id ? `.${id}` : ''}`;
  },
};

export const FLEET_SERVER_HOST_FLYOUT = {
  NAME_INPUT: 'fleetServerHostsFlyout.nameInput',
  DEFAULT_SWITCH: 'fleetServerHostsFlyout.isDefaultSwitch',
};

export const FLEET_SERVER_SETUP = {
  NAME_INPUT: 'fleetServerSetup.nameInput',
  HOST_INPUT: 'fleetServerSetup.multiRowInput',
  DEFAULT_SWITCH: 'fleetServerHostsFlyout.isDefaultSwitch',
  ADD_HOST_BTN: 'fleetServerSetup.addNewHostBtn',
  SELECT_HOSTS: 'fleetServerSetup.fleetServerHostsSelect',
};

export const API_KEYS = {
  REVOKE_KEY_BUTTON: 'enrollmentTokenTable.revokeBtn',
};

export const AGENT_POLICY_DETAILS_PAGE = {
  ADD_AGENT_LINK: 'addAgentLink',
  SETTINGS_TAB: 'agentPolicySettingsTab',
  SPACE_SELECTOR_COMBOBOX: 'spaceSelectorComboBox',
  SAVE_BUTTON: 'agentPolicyDetailsSaveButton',
};
