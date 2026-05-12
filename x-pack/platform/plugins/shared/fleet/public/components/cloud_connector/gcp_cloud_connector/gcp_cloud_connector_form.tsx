/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiAccordion, EuiSpacer, EuiButton, EuiLink, EuiText } from '@elastic/eui';

import {
  CLOUD_CONNECTOR_NAME_INPUT_TEST_SUBJ,
  GCP_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ,
  GCP_LAUNCH_CLOUD_CONNECTOR_CLOUD_SHELL_TEST_SUBJ,
} from '../../../../common/services/cloud_connectors/test_subjects';
import {
  extractRawCredentialVars,
  getCredentialKeyFromVarName,
  writeCredentials,
} from '../../../../common/services/cloud_connectors';
import type { CloudConnectorFormProps, CloudSetupForCloudConnector } from '../types';

import {
  getCloudConnectorRemoteRoleTemplate,
  updateInputVarsWithCredentials,
  isGcpCredentials,
  getDeploymentIdFromUrl,
  getKibanaComponentId,
} from '../utils';
import { ORGANIZATION_ACCOUNT } from '../constants';

import { CloudConnectorInputFields } from '../form/cloud_connector_input_fields';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';

import { getGcpCloudConnectorsCredentialsFormOptions } from './gcp_cloud_connector_options';
import { GoogleCloudShellCloudCredentialsGuide } from './gcp_cloud_shell_guide';

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

export const GCPCloudConnectorForm: React.FC<CloudConnectorFormProps> = ({
  newPolicy,
  packageInfo,
  cloud,
  updatePolicy,
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

  const updatedInputVars = credentials
    ? updateInputVarsWithCredentials(inputVars, credentials)
    : inputVars;

  const fields = getGcpCloudConnectorsCredentialsFormOptions(updatedInputVars);

  const elasticResourceId = getElasticStackId(cloud);
  const isOrganization = accountType === ORGANIZATION_ACCOUNT;

  const commandText = isOrganization
    ? `gcloud config set project <PROJECT_ID> && ORG_ID=<ORG_ID_VALUE> ELASTIC_RESOURCE_ID=${
        elasticResourceId || '<ELASTIC_RESOURCE_ID>'
      } ./deploy.sh`
    : `gcloud config set project <PROJECT_ID> && ELASTIC_RESOURCE_ID=${
        elasticResourceId || '<ELASTIC_RESOURCE_ID>'
      } ./deploy.sh`;

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
        id="googleCloudShellAccordianInstructions"
        data-test-subj={GCP_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ}
        buttonContent={
          <EuiLink>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.gcp.stepsToGenerateServiceAccount"
              defaultMessage="Steps to generate GCP Service Account"
            />
          </EuiLink>
        }
        paddingSize="l"
        initialIsOpen={true}
      >
        <GoogleCloudShellCloudCredentialsGuide
          isOrganization={isOrganization}
          commandText={commandText}
        />
      </EuiAccordion>
      <EuiSpacer size="l" />
      <EuiButton
        data-test-subj={GCP_LAUNCH_CLOUD_CONNECTOR_CLOUD_SHELL_TEST_SUBJ}
        target="_blank"
        iconSide="left"
        iconType="launch"
        href={cloudConnectorRemoteRoleTemplate}
      >
        <FormattedMessage
          id="xpack.fleet.cloudConnector.gcp.launchGoogleCloudShellButton"
          defaultMessage="Launch Google Cloud Shell"
        />
      </EuiButton>
      <EuiSpacer size="m" />

      {fields && (
        <CloudConnectorInputFields
          fields={fields}
          packageInfo={packageInfo}
          onChange={(key, value) => {
            const credentialKey = getCredentialKeyFromVarName('gcp', key);

            if (credentials && isGcpCredentials(credentials) && setCredentials && credentialKey) {
              setCredentials({ ...credentials, [credentialKey]: value });
              return;
            }

            if (credentialKey) {
              const updatedPolicy = writeCredentials(
                newPolicy,
                { [credentialKey]: value },
                'gcp',
                packageInfo
              );
              updatePolicy({ updatedPolicy });
            }
          }}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      )}
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.fleet.cloudConnector.gcp.readDocumentation"
          defaultMessage="Read the {documentation} for more details"
          values={{
            documentation: (
              <EuiLink
                href="https://www.elastic.co/docs/solutions/security/cloud/get-started-with-cspm-for-gcp#cspm-gcp-agentless"
                target="_blank"
                external
              >
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.gcp.documentationLink"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};
