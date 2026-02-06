/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { PackagePolicyConfigRecord } from '../../../../common';
import { GCP_INPUT_FIELDS_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';
import { GCP_CLOUD_CONNECTOR_FIELD_NAMES } from '../constants';

// Cloud Connector field labels
const GCP_CLOUD_CONNECTOR_FIELD_LABELS = {
  service_account: i18n.translate('xpack.fleet.cloudConnector.gcp.serviceAccount.label', {
    defaultMessage: 'Service Account',
  }),
  audience: i18n.translate('xpack.fleet.cloudConnector.gcp.audience.label', {
    defaultMessage: 'Audience',
  }),
  gcp_credentials_cloud_connector_id: i18n.translate(
    'xpack.fleet.cloudConnector.gcp.gcpCredentialsCloudConnectorId.label',
    {
      defaultMessage: 'Cloud Connector ID',
    }
  ),
} as const;

// Cloud Connector options interface
export interface GcpCloudConnectorOptions {
  id: string;
  label: string;
  type?: 'text' | 'password';
  dataTestSubj: string;
  isSecret?: boolean;
  value: string;
  helpText?: string;
  tooltip?: string;
}

// Define field sequence order
const FIELD_SEQUENCE = [
  GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT,
  GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT,
  GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE,
  GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE,
  GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID,
] as const;

export const getGcpCloudConnectorsCredentialsFormOptions = (
  inputVars?: PackagePolicyConfigRecord | undefined
) => {
  if (!inputVars) {
    return;
  }

  const fields: ({
    label: string;
    type?: 'text' | 'password' | undefined;
    isSecret?: boolean | undefined;
    dataTestSubj: string;
  } & {
    value: string;
    id: string;
    dataTestSubj: string;
  })[] = [];

  // Create a map of all available fields
  const availableFields = new Map<string, GcpCloudConnectorOptions>();

  if (inputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT]) {
    availableFields.set(GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT, {
      id: GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT,
      label: GCP_CLOUD_CONNECTOR_FIELD_LABELS.service_account,
      type: 'text' as const,
      dataTestSubj: GCP_INPUT_FIELDS_TEST_SUBJECTS.SERVICE_ACCOUNT,
      value: inputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT].value,
    });
  }

  if (inputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT]) {
    availableFields.set(GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT, {
      id: GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT,
      label: GCP_CLOUD_CONNECTOR_FIELD_LABELS.service_account,
      type: 'text' as const,
      dataTestSubj: GCP_INPUT_FIELDS_TEST_SUBJECTS.SERVICE_ACCOUNT,
      value: inputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT].value,
      tooltip:
        'The email address of the GCP service account that Elastic will use to authenticate and access your GCP resources.',
    });
  }

  if (inputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE]) {
    availableFields.set(GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE, {
      id: GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE,
      label: GCP_CLOUD_CONNECTOR_FIELD_LABELS.audience,
      type: 'text' as const,
      dataTestSubj: GCP_INPUT_FIELDS_TEST_SUBJECTS.AUDIENCE,
      value: inputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE].value,
    });
  }

  if (inputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE]) {
    availableFields.set(GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE, {
      id: GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE,
      label: GCP_CLOUD_CONNECTOR_FIELD_LABELS.audience,
      type: 'text' as const,
      dataTestSubj: GCP_INPUT_FIELDS_TEST_SUBJECTS.AUDIENCE,
      value: inputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE].value,
      tooltip:
        'The intended recipient of the ID token used for workload identity federation between Elastic and GCP.',
    });
  }

  if (inputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID]) {
    availableFields.set(GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID, {
      id: GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID,
      label: GCP_CLOUD_CONNECTOR_FIELD_LABELS.gcp_credentials_cloud_connector_id,
      type: 'text' as const,
      dataTestSubj: GCP_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID,
      value: inputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID].value,
      tooltip:
        'A unique identifier for this cloud connector configuration used to link and manage credentials across integrations.',
    });
  }

  // Build fields array in sequence order
  FIELD_SEQUENCE.forEach((fieldId) => {
    const field = availableFields.get(fieldId);
    if (field) {
      fields.push(field);
    }
  });
  return fields;
};
