/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Cloud Connector test subjects
export const AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ = 'aws-cloud-connector-super-select';
export const AZURE_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ = 'azure-cloud-connector-super-select';
export const GCP_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ = 'gcp-cloud-connector-super-select';
export const CLOUD_CONNECTOR_NAME_INPUT_TEST_SUBJ = 'cloudConnectorNameInput';
export const CLOUD_CONNECTOR_EDIT_ICON_TEST_SUBJ = 'cloudConnectorEditIcon';
export const getCloudConnectorEditIconTestSubj = (connectorId: string) =>
  `${CLOUD_CONNECTOR_EDIT_ICON_TEST_SUBJ}-${connectorId}`;

// Azure-specific test subjects
export const AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ =
  'launchCloudConnectorArmAccordianInstructions';
export const AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ =
  'azureLaunchCloudConnectorArmTemplate';

export const AZURE_INPUT_FIELDS_TEST_SUBJECTS = {
  TENANT_ID: 'textInput-tenant-id',
  CLIENT_ID: 'textInput-client-id',
  CLIENT_SECRET: 'passwordInput-client-secret',
  CLIENT_CERTIFICATE_PATH: 'cloudSetupAzureClientCertificatePath',
  CLIENT_CERTIFICATE_PASSWORD: 'passwordInput-client-certificate-password',
  CLOUD_CONNECTOR_ID: 'cloudSetupAzureCloudConnectorId',
};

// GCP-specific test subjects
export const GCP_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ =
  'launchCloudConnectorGcpAccordianInstructions';
export const GCP_LAUNCH_CLOUD_CONNECTOR_CLOUD_SHELL_TEST_SUBJ = 'gcpLaunchCloudConnectorCloudShell';

export const GCP_INPUT_FIELDS_TEST_SUBJECTS = {
  SERVICE_ACCOUNT: 'gcpCredentialsServiceAccountInput',
  AUDIENCE: 'gcpCredentialsAudienceInput',
  CLOUD_CONNECTOR_ID: 'gcpCredentialsCloudConnectorIdInput',
};

export const CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS = {
  FLYOUT: 'cloudConnectorPoliciesFlyout',
  CLOSE_BUTTON: 'cloudConnectorPoliciesFlyoutCloseButton',
  TITLE: 'cloudConnectorPoliciesFlyoutTitle',
  IDENTIFIER_TEXT: 'cloudConnectorIdentifierText',
  COPY_IDENTIFIER_BUTTON: 'cloudConnectorCopyIdentifier',
  NAME_INPUT: 'cloudConnectorPoliciesFlyoutNameInput',
  SAVE_NAME_BUTTON: 'cloudConnectorSaveNameButton',
  USAGE_COUNT_TEXT: 'cloudConnectorUsageCountText',
  POLICIES_TABLE: 'cloudConnectorPoliciesTable',
  POLICY_LINK: 'cloudConnectorPolicyLink',
  EMPTY_STATE: 'cloudConnectorPoliciesEmptyState',
  ERROR_STATE: 'cloudConnectorPoliciesErrorState',
  DELETE_CONNECTOR_BUTTON: 'cloudConnectorDeleteButton',
  FOOTER_SAVE_BUTTON: 'cloudConnectorFooterSaveButton',
  DELETE_CONFIRM_MODAL: 'cloudConnectorDeleteConfirmModal',
  DELETE_MODAL_CALLOUT: 'cloudConnectorDeleteModalCallout',
};

// Permission status — Story 3 (cell badge + popover)
export const PERMISSION_STATUS_TEST_SUBJECTS = {
  CELL: 'cloudConnectorPermissionStatusCell',
  BADGE: 'cloudConnectorPermissionStatusBadge',
  POPOVER: 'cloudConnectorPermissionStatusPopover',
  POPOVER_TITLE: 'cloudConnectorPermissionStatusPopoverTitle',
  POPOVER_LAST_VERIFIED: 'cloudConnectorPermissionStatusPopoverLastVerified',
  PERMISSION_GROUP: 'cloudConnectorPermissionGroup',
  PERMISSION_LIST_ITEM: 'cloudConnectorPermissionListItem',
  OPEN_DASHBOARD_BUTTON: 'cloudConnectorOpenDashboardButton',
  LEARN_MORE_LINK: 'cloudConnectorLearnMoreLink',
};

// Identity-level summary — Story 4 (flyout header rollup)
export const IDENTITY_PERMISSION_SUMMARY_TEST_SUBJECTS = {
  CONTAINER: 'cloudConnectorIdentityPermissionSummary',
  BADGE: 'cloudConnectorIdentityPermissionBadge',
  LAST_VERIFIED: 'cloudConnectorIdentityLastVerified',
  COUNTS: 'cloudConnectorIdentityPermissionCounts',
};

// Row-expand + timeline — Story 7 (deep-drill view per integration)
export const PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS = {
  CONTAINER: 'cloudConnectorPermissionRowExpansion',
  TIMELINE: 'cloudConnectorVerificationTimeline',
  TIMELINE_EVENT: 'cloudConnectorVerificationTimelineEvent',
  TIMELINE_EMPTY: 'cloudConnectorVerificationTimelineEmpty',
  PERMISSIONS_TABLE: 'cloudConnectorCurrentPermissionsTable',
  EXPAND_TOGGLE: 'cloudConnectorPermissionStatusExpandToggle',
};
