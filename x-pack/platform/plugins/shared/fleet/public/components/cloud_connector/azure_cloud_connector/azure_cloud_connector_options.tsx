/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';

import { AZURE_INPUT_FIELDS_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';
import type { PackagePolicyConfigRecord } from '../../../../common';
import type { CloudConnectorField } from '../types';
import { AZURE_CLOUD_CONNECTOR_FIELD_NAMES, AZURE_PROVIDER } from '../constants';

const AZURE_CLOUD_CONNECTOR_FIELD_LABELS = {
  tenant_id: i18n.translate('xpack.fleet.cloudConnector.azure.tenantIdLabel', {
    defaultMessage: 'Tenant ID',
  }),
  client_id: i18n.translate('xpack.fleet.cloudConnector.azure.clientIdLabel', {
    defaultMessage: 'Client ID',
  }),
  cloud_connector_id: i18n.translate('xpack.fleet.cloudConnector.azure.cloudConnectorIdLabel', {
    defaultMessage: 'Cloud Connector ID',
  }),
};

interface AzureCloudConnectorOptions {
  id: string;
  label: string;
  type: 'text' | 'password';
  dataTestSubj: string;
  isSecret?: boolean;
  value: string;
}

// Define field sequence order
const FIELD_SEQUENCE = [
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID,
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID,
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID,
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID,
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID,
] as const;

export const getAzureCloudConnectorsCredentialsFormOptions = (
  inputVars?: PackagePolicyConfigRecord | undefined
) => {
  if (!inputVars) {
    return;
  }

  const fields: CloudConnectorField[] = []; // Create a map of all available fields
  const availableFields = new Map<string, AzureCloudConnectorOptions>();

  if (inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]) {
    const tenantIdValue = inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID].value;
    // Extract the id if it's a secret reference object, otherwise use the value as-is
    const displayValue =
      typeof tenantIdValue === 'object' && tenantIdValue?.id ? tenantIdValue.id : tenantIdValue;

    availableFields.set(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID, {
      id: AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID,
      label: AZURE_CLOUD_CONNECTOR_FIELD_LABELS.tenant_id,
      type: 'text' as const,
      dataTestSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
      isSecret: true,
      value: displayValue,
    });
  }

  if (inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]) {
    const tenantIdValue = inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID].value;
    // Extract the id if it's a secret reference object, otherwise use the value as-is
    const displayValue =
      typeof tenantIdValue === 'object' && tenantIdValue?.id ? tenantIdValue.id : tenantIdValue;

    availableFields.set(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID, {
      id: AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID,
      label: AZURE_CLOUD_CONNECTOR_FIELD_LABELS.tenant_id,
      type: 'text' as const,
      dataTestSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
      isSecret: true,
      value: displayValue,
    });
  }

  if (inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID]) {
    const clientIdValue = inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID].value;
    // Extract the id if it's a secret reference object, otherwise use the value as-is
    const displayValue =
      typeof clientIdValue === 'object' && clientIdValue?.id ? clientIdValue.id : clientIdValue;

    availableFields.set(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID, {
      id: AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID,
      label: AZURE_CLOUD_CONNECTOR_FIELD_LABELS.client_id,
      type: 'text' as const,
      dataTestSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
      isSecret: true,
      value: displayValue,
    });
  }

  if (inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]) {
    const clientIdValue = inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID].value;
    // Extract the id if it's a secret reference object, otherwise use the value as-is
    const displayValue =
      typeof clientIdValue === 'object' && clientIdValue?.id ? clientIdValue.id : clientIdValue;

    availableFields.set(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID, {
      id: AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID,
      label: AZURE_CLOUD_CONNECTOR_FIELD_LABELS.client_id,
      type: 'text' as const,
      dataTestSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
      isSecret: true,
      value: displayValue,
    });
  }

  if (inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]) {
    const azureCredentialsValue =
      inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID].value;
    // Extract the id if it's a secret reference object, otherwise use the value as-is
    const displayValue =
      typeof azureCredentialsValue === 'object' && azureCredentialsValue?.id
        ? azureCredentialsValue.id
        : azureCredentialsValue;

    availableFields.set(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID, {
      id: AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID,
      label: AZURE_CLOUD_CONNECTOR_FIELD_LABELS.cloud_connector_id,
      type: 'text' as const,
      dataTestSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID,
      value: displayValue,
    });
  }

  // Add fields in the defined sequence if they are available
  for (const fieldName of FIELD_SEQUENCE) {
    const field = availableFields.get(fieldName);
    if (field) {
      fields.push(field);
    }
  }

  return {
    provider: AZURE_PROVIDER,
    fields,
    description: (
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.fleet.cloudConnector.azure.description"
          defaultMessage="Configure Azure Cloud Connector credentials to securely connect to your Azure resources. The Cloud Connector will use these credentials to authenticate and collect security posture data."
        />
      </EuiText>
    ),
  };
};
