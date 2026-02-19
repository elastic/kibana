/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiAccordion, EuiSpacer, EuiButton, EuiLink } from '@elastic/eui';

import { CLOUD_CONNECTOR_NAME_INPUT_TEST_SUBJ } from '../../../../common/services/cloud_connectors/test_subjects';
import { extractRawCredentialVars } from '../../../../common';
import { type CloudConnectorFormProps } from '../types';

import {
  updatePolicyWithAwsCloudConnectorCredentials,
  getCloudConnectorRemoteRoleTemplate,
  updateInputVarsWithCredentials,
  isAwsCredentials,
  type AwsCloudConnectorFieldNames,
} from '../utils';
import { AWS_CLOUD_CONNECTOR_FIELD_NAMES, AWS_PROVIDER } from '../constants';

import { CloudConnectorInputFields } from '../form/cloud_connector_input_fields';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';

import { getAwsCloudConnectorsCredentialsFormOptions } from './aws_cloud_connector_options';
import { CloudFormationCloudCredentialsGuide } from './aws_cloud_formation_guide';

export const AWSCloudConnectorForm: React.FC<CloudConnectorFormProps> = ({
  input,
  newPolicy,
  packageInfo,
  cloud,
  updatePolicy,
  hasInvalidRequiredVars = false,
  isOrganization = false,
  templateName,
  credentials,
  setCredentials,
}) => {
  const cloudConnectorRemoteRoleTemplate =
    cloud && templateName
      ? getCloudConnectorRemoteRoleTemplate({
          input,
          cloud,
          packageInfo,
          templateName,
          provider: AWS_PROVIDER,
        })
      : undefined;

  // Use accessor to get vars from the correct location (package-level or input-level)
  const inputVars = extractRawCredentialVars(newPolicy, packageInfo);

  // Update inputVars with current credentials using utility function or inputVars if no credentials are provided
  const updatedInputVars = credentials
    ? updateInputVarsWithCredentials(inputVars, credentials)
    : inputVars;

  const fields = getAwsCloudConnectorsCredentialsFormOptions(updatedInputVars);

  return (
    <>
      <CloudConnectorNameField
        value={credentials?.name || ''}
        onChange={(name, isValid, error) => {
          if (credentials && setCredentials) {
            setCredentials({
              ...credentials,
              name,
            });
          }
        }}
        data-test-subj={CLOUD_CONNECTOR_NAME_INPUT_TEST_SUBJ}
      />
      <EuiSpacer size="m" />
      <EuiAccordion
        id="cloudFormationAccordianInstructions"
        data-test-subj={''}
        buttonContent={<EuiLink>{'Steps to assume role'}</EuiLink>}
        paddingSize="l"
      >
        <CloudFormationCloudCredentialsGuide isOrganization={isOrganization} />
      </EuiAccordion>
      <EuiSpacer size="l" />
      <EuiButton
        data-test-subj="launchCloudFormationAgentlessButton"
        target="_blank"
        iconSide="left"
        iconType="launch"
        href={cloudConnectorRemoteRoleTemplate}
      >
        <FormattedMessage
          id="xpack.fleet.cloudConnector.aws.launchCloudFormationButton"
          defaultMessage="Launch CloudFormation"
        />
      </EuiButton>
      <EuiSpacer size="m" />

      {fields && (
        <CloudConnectorInputFields
          fields={fields}
          packageInfo={packageInfo}
          onChange={(key, value) => {
            // Update local credentials state if available
            if (credentials && isAwsCredentials(credentials) && setCredentials) {
              const updatedCredentials = { ...credentials };
              if (
                key === AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN ||
                key === AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN
              ) {
                updatedCredentials.roleArn = value;
              } else if (
                key === AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID ||
                key === AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID
              ) {
                updatedCredentials.externalId = value;
              }
              setCredentials(updatedCredentials);
            } else {
              // Fallback to old method
              updatePolicy({
                updatedPolicy: updatePolicyWithAwsCloudConnectorCredentials(newPolicy, input, {
                  [key]: value,
                } as Record<AwsCloudConnectorFieldNames, string | undefined>),
              });
            }
          }}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      )}
    </>
  );
};
