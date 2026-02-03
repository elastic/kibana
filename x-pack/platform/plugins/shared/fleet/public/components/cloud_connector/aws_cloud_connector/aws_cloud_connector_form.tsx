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
import {
  extractRawCredentialVars,
  getCredentialKeyFromVarName,
} from '../../../../common/services/cloud_connectors';
import { type CloudConnectorFormProps } from '../types';

import {
  getCloudConnectorRemoteRoleTemplate,
  updateInputVarsWithCredentials,
  isAwsCredentials,
} from '../utils';
import { ORGANIZATION_ACCOUNT } from '../constants';

import { CloudConnectorInputFields } from '../form/cloud_connector_input_fields';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';

import { getAwsCloudConnectorsCredentialsFormOptions } from './aws_cloud_connector_options';
import { CloudFormationCloudCredentialsGuide } from './aws_cloud_formation_guide';

export const AWSCloudConnectorForm: React.FC<CloudConnectorFormProps> = ({
  newPolicy,
  packageInfo,
  cloud,
  hasInvalidRequiredVars = false,
  credentials,
  setCredentials,
  accountType = ORGANIZATION_ACCOUNT,
  iacTemplateUrl,
}) => {
  const cloudConnectorRemoteRoleTemplate = cloud
    ? getCloudConnectorRemoteRoleTemplate({
        cloud,
        accountType,
        iacTemplateUrl,
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
        <CloudFormationCloudCredentialsGuide accountType={accountType} />
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
            if (!credentials || !isAwsCredentials(credentials) || !setCredentials) return;

            // Use schema-based lookup to map var names to credential properties
            const credentialKey = getCredentialKeyFromVarName('aws', key);
            if (credentialKey) {
              setCredentials({ ...credentials, [credentialKey]: value });
            }
          }}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      )}
    </>
  );
};
