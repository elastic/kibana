/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Cloud Connector test subjects
export const AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ = 'aws-cloud-connector-super-select';
export const AZURE_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ = 'azure-cloud-connector-super-select';
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

export const CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS = {
  FLYOUT: 'cloudConnectorPoliciesFlyout',
  CLOSE_BUTTON: 'cloudConnectorPoliciesFlyoutCloseButton',
  TITLE: 'cloudConnectorPoliciesFlyoutTitle',
  IDENTIFIER_TEXT: 'cloudConnectorIdentifierText',
  COPY_IDENTIFIER_BUTTON: 'cloudConnectorCopyIdentifier',
  NAME_INPUT: 'cloudConnectorNameInput',
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
