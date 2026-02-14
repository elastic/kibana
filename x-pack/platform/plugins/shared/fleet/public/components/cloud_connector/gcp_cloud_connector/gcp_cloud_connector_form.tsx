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
import { extractRawCredentialVars, ORGANIZATION_ACCOUNT } from '../../../../common';
import { type CloudConnectorFormProps } from '../types';

import {
  updatePolicyWithGcpCloudConnectorCredentials,
  getCloudConnectorRemoteRoleTemplate,
  updateInputVarsWithCredentials,
  isGcpCredentials,
  getElasticResourceId,
  type GcpCloudConnectorFieldNames,
} from '../utils';
import { GCP_CLOUD_CONNECTOR_FIELD_NAMES, GCP_PROVIDER } from '../constants';

import { CloudConnectorInputFields } from '../form/cloud_connector_input_fields';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';

import { getGcpCloudConnectorsCredentialsFormOptions } from './gcp_cloud_connector_options';
import { GoogleCloudShellCloudCredentialsGuide } from './gcp_cloud_shell_guide';

export const GCPCloudConnectorForm: React.FC<CloudConnectorFormProps> = ({
  input,
  newPolicy,
  packageInfo,
  cloud,
  updatePolicy,
  hasInvalidRequiredVars = false,
  templateName,
  credentials,
  setCredentials,
  accountType,
}) => {
  const isOrganization = accountType === ORGANIZATION_ACCOUNT;

  const cloudConnectorRemoteRoleTemplate =
    cloud && templateName
      ? getCloudConnectorRemoteRoleTemplate({
          input,
          cloud,
          packageInfo,
          templateName,
          provider: GCP_PROVIDER,
        })
      : undefined;

  // Use accessor to get vars from the correct location (package-level or input-level)
  const inputVars = extractRawCredentialVars(newPolicy, packageInfo);

  // Update inputVars with current credentials using utility function or inputVars if no credentials are provided
  const updatedInputVars = credentials
    ? updateInputVarsWithCredentials(inputVars, credentials)
    : inputVars;

  const fields = getGcpCloudConnectorsCredentialsFormOptions(updatedInputVars);

  // Get the Elastic Resource ID from cloud setup
  const elasticResourceId = getElasticResourceId(cloud);

  // Generate command text based on organization type
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
            // Update local credentials state if available
            if (credentials && isGcpCredentials(credentials) && setCredentials) {
              const updatedCredentials = { ...credentials };
              if (
                key === GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT ||
                key === GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT
              ) {
                updatedCredentials.serviceAccount = value;
              } else if (
                key === GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE ||
                key === GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE
              ) {
                updatedCredentials.audience = value;
              } else if (
                key === GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID
              ) {
                updatedCredentials.gcp_credentials_cloud_connector_id = value;
              }
              setCredentials(updatedCredentials);
            } else {
              // Fallback to old method
              updatePolicy({
                updatedPolicy: updatePolicyWithGcpCloudConnectorCredentials(newPolicy, input, {
                  [key]: value,
                } as Record<GcpCloudConnectorFieldNames, string | undefined>),
              });
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
