/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiAccordion, EuiSpacer, EuiButton, EuiCallOut, EuiLink } from '@elastic/eui';

import {
  CLOUD_CONNECTOR_NAME_INPUT_TEST_SUBJ,
  CLOUD_CONNECTOR_TEMPLATE_GENERATION_ERROR_CALLOUT_TEST_SUBJ,
} from '../../../../common/services/cloud_connectors/test_subjects';
import {
  extractRawCredentialVars,
  getCredentialKeyFromVarName,
} from '../../../../common/services/cloud_connectors';
import { type CloudConnectorFormProps } from '../types';

import { updateInputVarsWithCredentials, isAwsCredentials } from '../utils';
import { ORGANIZATION_ACCOUNT } from '../constants';

import { CloudConnectorInputFields } from '../form/cloud_connector_input_fields';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';

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
  // The rendered template must cover every policy template the user enabled
  // in this policy — not just the first enabled input's.
  const enabledPolicyTemplates = useMemo(
    () => [
      ...new Set(
        newPolicy?.inputs
          ?.filter((input) => input.enabled)
          .map((input) => input.policy_template)
          .filter((policyTemplate): policyTemplate is string => Boolean(policyTemplate)) ?? []
      ),
    ],
    [newPolicy?.inputs]
  );

  const { launchButtonProps, isDisabled, isGeneratingTemplate, templateGenerationError } =
    useCloudConnectorTemplate({
      cloud,
      accountType,
      iacTemplateUrl,
      packageName: packageInfo?.name,
      policyTemplates: enabledPolicyTemplates,
    });

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
        iconSide="left"
        iconType="rocket"
        isLoading={isGeneratingTemplate}
        isDisabled={isDisabled}
        {...launchButtonProps}
      >
        <FormattedMessage
          id="xpack.fleet.cloudConnector.aws.launchCloudFormationButton"
          defaultMessage="Launch CloudFormation"
        />
      </EuiButton>
      {templateGenerationError && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            data-test-subj={CLOUD_CONNECTOR_TEMPLATE_GENERATION_ERROR_CALLOUT_TEST_SUBJ}
            title={templateGenerationError}
            color="danger"
            iconType="error"
            size="s"
          />
        </>
      )}
      <EuiSpacer size="m" />

      {fields && (
        <CloudConnectorInputFields
          fields={fields}
          packageInfo={packageInfo}
          onChange={(key, value) => {
            if (!credentials || !isAwsCredentials(credentials) || !setCredentials) return;

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
