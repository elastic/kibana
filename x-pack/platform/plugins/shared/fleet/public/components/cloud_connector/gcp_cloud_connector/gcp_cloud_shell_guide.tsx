/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiSpacer, EuiCode, EuiCodeBlock } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface GoogleCloudShellCloudCredentialsGuideProps {
  isOrganization?: boolean;
  commandText?: string;
}

export const GoogleCloudShellCloudCredentialsGuide: React.FC<
  GoogleCloudShellCloudCredentialsGuideProps
> = ({ isOrganization = false, commandText }) => {
  const defaultCommand = isOrganization
    ? 'gcloud config set project <PROJECT_ID> && ORG_ID=<ORG_ID_VALUE> ELASTIC_RESOURCE_ID=<ELASTIC_RESOURCE_ID> ./deploy.sh'
    : 'gcloud config set project <PROJECT_ID> && ELASTIC_RESOURCE_ID=<ELASTIC_RESOURCE_ID> ./deploy.sh';

  return (
    <>
      <EuiText size="s">
        <ol>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.gcp.guide.step1"
              defaultMessage="Log into your {googleCloudConsole}"
              values={{
                googleCloudConsole: <strong>Google Cloud Console</strong>,
              }}
            />
          </li>
          <li>
            {isOrganization ? (
              <FormattedMessage
                id="xpack.fleet.cloudConnector.gcp.guide.step2.organization"
                defaultMessage="Replace {projectIdPlaceholder} and {orgIdPlaceholder} in the following command with your project ID and organization ID then copy the command"
                values={{
                  projectIdPlaceholder: <EuiCode>&lt;PROJECT_ID&gt;</EuiCode>,
                  orgIdPlaceholder: <EuiCode>&lt;ORG_ID_VALUE&gt;</EuiCode>,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.cloudConnector.gcp.guide.step2"
                defaultMessage="Replace {projectIdPlaceholder} in the following command with your project ID then copy the command"
                values={{
                  projectIdPlaceholder: <EuiCode>&lt;PROJECT_ID&gt;</EuiCode>,
                }}
              />
            )}
            <EuiSpacer size="s" />
            <EuiCodeBlock fontSize="m" paddingSize="m" isCopyable>
              {commandText || defaultCommand}
            </EuiCodeBlock>
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.gcp.guide.step3"
              defaultMessage="Click the {launchButton} button below and log into your account"
              values={{
                launchButton: <strong>Launch Google Cloud Shell</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.gcp.guide.step4"
              defaultMessage="Check {trustRepo} and click {confirm}"
              values={{
                trustRepo: <strong>Trust Repo</strong>,
                confirm: <strong>Confirm</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.gcp.guide.step5"
              defaultMessage="Click {authorize} if prompted to authorize {googleCloudShell}"
              values={{
                authorize: <strong>Authorize</strong>,
                googleCloudShell: <strong>Google Cloud Shell</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.gcp.guide.step6"
              defaultMessage="Paste and run command in the {googleCloudShell} terminal"
              values={{
                googleCloudShell: <strong>Google Cloud Shell</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.gcp.guide.step7"
              defaultMessage="Copy the {targetServiceAccount}, {audience}, and {cloudConnectorId} outputs and paste into inputs below"
              values={{
                targetServiceAccount: <strong>Target Service Account</strong>,
                audience: <strong>Audience</strong>,
                cloudConnectorId: <strong>Cloud Connector ID</strong>,
              }}
            />
          </li>
        </ol>
      </EuiText>
    </>
  );
};
