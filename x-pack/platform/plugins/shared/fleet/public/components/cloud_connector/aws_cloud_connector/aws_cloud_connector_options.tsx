/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import type { PackagePolicyConfigRecord } from '../../../../common';
import { AWS_CLOUD_CONNECTOR_FIELD_NAMES } from '../constants';
import type { CloudConnectorField } from '../types';
import { INVALID_ROLE_ARN_MESSAGE, isRoleArnInvalid } from '../utils';

const validateRoleArn = (value: string | undefined): string | undefined =>
  isRoleArnInvalid(value) ? INVALID_ROLE_ARN_MESSAGE : undefined;

// Cloud Connector field labels
const AWS_CLOUD_CONNECTOR_FIELD_LABELS = {
  role_arn: i18n.translate('xpack.fleet.cloudConnector.aws.roleArnLabel', {
    defaultMessage: 'Role ARN',
  }),
  external_id: i18n.translate('xpack.fleet.cloudConnector.aws.externalIdLabel', {
    defaultMessage: 'External ID',
  }),
} as const;

// Cloud Connector options interface
export interface AwsCloudConnectorOptions {
  id: string;
  label: string;
  type?: 'text' | 'password';
  dataTestSubj: string;
  isSecret?: boolean;
  value: string;
  validate?: CloudConnectorField['validate'];
}

// Define field sequence order
const FIELD_SEQUENCE = [
  AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN,
  AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN,
  AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID,
  AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID,
] as const;

export const getAwsCloudConnectorsCredentialsFormOptions = (
  inputVars?: PackagePolicyConfigRecord | undefined
) => {
  if (!inputVars) {
    return;
  }

  const fields: AwsCloudConnectorOptions[] = [];

  // Create a map of all available fields
  const availableFields = new Map<string, AwsCloudConnectorOptions>();

  if (inputVars.role_arn) {
    availableFields.set(AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN, {
      id: AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN,
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.role_arn,
      type: 'text' as const,
      dataTestSubj: 'awsRoleArnInput',
      value: inputVars.role_arn.value,
      validate: validateRoleArn,
    });
  }

  if (inputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN]) {
    availableFields.set(AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN, {
      id: AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN,
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.role_arn,
      type: 'text' as const,
      dataTestSubj: 'awsRoleArnInput',
      value: inputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN].value,
      validate: validateRoleArn,
    });
  }

  if (inputVars['aws.credentials.external_id']) {
    availableFields.set('aws.credentials.external_id', {
      id: AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID,
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.external_id,
      type: 'password' as const,
      dataTestSubj: 'awsCloudConnectorExternalId',
      isSecret: true,
      value: inputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID].value,
    });
  }

  if (inputVars.external_id) {
    availableFields.set(AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID, {
      id: AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID,
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.external_id,
      type: 'password' as const,
      dataTestSubj: 'awsCloudConnectorExternalId',
      isSecret: true,
      value: inputVars.external_id.value,
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
