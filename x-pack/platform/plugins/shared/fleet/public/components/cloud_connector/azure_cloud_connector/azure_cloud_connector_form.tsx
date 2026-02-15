/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiAccordion, EuiSpacer, EuiButton, EuiLink } from '@elastic/eui';

import {
  AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ,
  AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ,
  CLOUD_CONNECTOR_NAME_INPUT_TEST_SUBJ,
} from '../../../../common/services/cloud_connectors/test_subjects';
import {
  extractRawCredentialVars,
  getCredentialKeyFromVarName,
  writeCredentials,
} from '../../../../common/services/cloud_connectors';
import type { CloudConnectorFormProps, CloudSetupForCloudConnector } from '../types';

import {
  getCloudConnectorRemoteRoleTemplate,
  isAzureCredentials,
  updateInputVarsWithCredentials,
  getDeploymentIdFromUrl,
  getKibanaComponentId,
} from '../utils';
import { ORGANIZATION_ACCOUNT } from '../constants';

import { CloudConnectorInputFields } from '../form/cloud_connector_input_fields';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';

import { getAzureCloudConnectorsCredentialsFormOptions } from './azure_cloud_connector_options';
import { AzureArmTemplateGuide } from './azure_arm_template_guide';

const getElasticStackId = (cloud?: CloudSetupForCloudConnector): string | undefined => {
  if (!cloud) return undefined;

  if (cloud?.isServerlessEnabled && cloud?.serverless?.projectId) {
    return cloud.serverless.projectId;
  }

  const deploymentId = getDeploymentIdFromUrl(cloud?.deploymentUrl);
  const kibanaComponentId = getKibanaComponentId(cloud?.cloudId);

  if (cloud?.isCloudEnabled && deploymentId && kibanaComponentId) {
    return kibanaComponentId;
  }

  return undefined;
};

export const AzureCloudConnectorForm: React.FC<CloudConnectorFormProps> = ({
  newPolicy,
  packageInfo,
  updatePolicy,
  cloud,
  hasInvalidRequiredVars = false,
  credentials,
  setCredentials,
  accountType = ORGANIZATION_ACCOUNT,
  iacTemplateUrl,
}) => {
  const armTemplateUrl = cloud
    ? getCloudConnectorRemoteRoleTemplate({
        cloud,
        accountType,
        iacTemplateUrl,
      })
    : undefined;

  const elasticStackId = getElasticStackId(cloud);

  // Use accessor to get vars from the correct location (package-level or input-level)
  const inputVars = extractRawCredentialVars(newPolicy, packageInfo);

  const updatedInputVars = credentials
    ? updateInputVarsWithCredentials(inputVars, credentials)
    : inputVars;

  const azureFormConfig = getAzureCloudConnectorsCredentialsFormOptions(updatedInputVars);
  const fields = azureFormConfig?.fields;

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
        id="armTemplateAccordianInstructions"
        data-test-subj={AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ}
        buttonContent={<EuiLink>{'Steps to create Managed User Identity in Azure'}</EuiLink>}
        paddingSize="l"
        initialIsOpen={true}
      >
        <AzureArmTemplateGuide elasticStackId={elasticStackId} />
      </EuiAccordion>
      <EuiSpacer size="l" />
      {armTemplateUrl && (
        <>
          <EuiButton
            data-test-subj={AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ}
            target="_blank"
            iconSide="left"
            iconType="launch"
            href={armTemplateUrl}
          >
            <FormattedMessage
              id="xpack.fleet.cloudConnector.azure.deployToAzureButton"
              defaultMessage="Deploy to Azure"
            />
          </EuiButton>
          <EuiSpacer size="m" />
        </>
      )}

      {fields && (
        <CloudConnectorInputFields
          fields={fields}
          packageInfo={packageInfo}
          onChange={(key, value) => {
            // Use schema-based lookup to map var names to credential properties
            const credentialKey = getCredentialKeyFromVarName('azure', key);

            // If we have credentials and setCredentials, update via credentials state
            if (credentials && isAzureCredentials(credentials) && setCredentials && credentialKey) {
              setCredentials({ ...credentials, [credentialKey]: value });
              return;
            }

            // Fallback: update policy directly when credentials or setCredentials is unavailable
            if (credentialKey) {
              const updatedPolicy = writeCredentials(
                newPolicy,
                { [credentialKey]: value },
                'azure',
                packageInfo
              );
              updatePolicy({ updatedPolicy });
            }
          }}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      )}
    </>
  );
};
