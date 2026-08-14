/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButton,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

type PreferredMethod = 'identity_federation' | 'access_keys';

interface ManagedIntegrationsSectionProps {
  serviceCount: number;
  showIdentityFederation: boolean;
}

function IdentityFederationForm() {
  const [federatedIdentityName, setFederatedIdentityName] = useState('');
  const [roleArn, setRoleArn] = useState('');

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.federatedIdentityNameLabel"
            defaultMessage="Federated Identity Name"
          />
        }
      >
        <EuiFieldText
          value={federatedIdentityName}
          onChange={(e) => setFederatedIdentityName(e.target.value)}
          placeholder="e.g. elastic-forwarder-prod"
          data-test-subj="managedIntegrationsSection-federatedIdentityName"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiAccordion
        id="assumeRoleStepsAccordion"
        buttonContent={
          <FormattedMessage
            id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.assumeRoleSteps.title"
            defaultMessage="Steps to assume role"
          />
        }
        arrowDisplay="left"
        paddingSize="s"
        data-test-subj="managedIntegrationsSection-assumeRoleSteps"
      >
        <EuiText size="s" color="subdued">
          <ol>
            <li>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.assumeRoleSteps.step1"
                defaultMessage="Log in to your AWS Management Console and navigate to IAM &gt; Roles &gt; Create role."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.assumeRoleSteps.step2"
                defaultMessage="Select {boldText} as the trusted entity type and enter the Elastic account ID."
                values={{ boldText: <strong>Another AWS account</strong> }}
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.assumeRoleSteps.step3"
                defaultMessage="Attach the required permissions policy to the role."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.assumeRoleSteps.step4"
                defaultMessage="Copy the Role ARN and enter it in the field below."
              />
            </li>
          </ol>
        </EuiText>
      </EuiAccordion>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.roleArnLabel"
            defaultMessage="Role ARN"
          />
        }
      >
        <EuiFieldText
          value={roleArn}
          onChange={(e) => setRoleArn(e.target.value)}
          placeholder="arn:aws:iam::123456789012:role/elastic-forwarder"
          data-test-subj="managedIntegrationsSection-roleArn"
        />
      </EuiFormRow>
    </>
  );
}

function AccessKeysForm() {
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.accessKeyIdLabel"
            defaultMessage="Access key ID"
          />
        }
      >
        <EuiFieldText
          value={accessKeyId}
          onChange={(e) => setAccessKeyId(e.target.value)}
          data-test-subj="managedIntegrationsSection-accessKeyId"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.secretAccessKeyLabel"
            defaultMessage="Secret access key"
          />
        }
      >
        <EuiFieldPassword
          value={secretAccessKey}
          onChange={(e) => setSecretAccessKey(e.target.value)}
          data-test-subj="managedIntegrationsSection-secretAccessKey"
        />
      </EuiFormRow>
    </>
  );
}

export function ManagedIntegrationsSection({
  serviceCount,
  showIdentityFederation,
}: ManagedIntegrationsSectionProps) {
  const { euiTheme } = useEuiTheme();
  const contentId = useGeneratedHtmlId({ prefix: 'managedIntegrationsContent' });
  const [isOpen, setIsOpen] = useState(true);
  const [preferredMethod, setPreferredMethod] = useState<PreferredMethod>(
    showIdentityFederation ? 'identity_federation' : 'access_keys'
  );

  const radioOptions = [
    {
      id: 'identity_federation',
      label: i18n.translate(
        'xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.preferredMethod.identityFederation',
        { defaultMessage: 'Identity Federation' }
      ),
    },
    {
      id: 'access_keys',
      label: i18n.translate(
        'xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.preferredMethod.accessKeys',
        { defaultMessage: 'Access Keys' }
      ),
    },
  ];

  const headerButtonCss = css`
    display: block;
    width: 100%;
    text-align: left;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border: none;
    padding: ${euiTheme.size.l} ${euiTheme.size.m};
    cursor: pointer;
    border-bottom: ${isOpen ? `1px solid ${euiTheme.colors.borderBaseSubdued}` : 'none'};
  `;

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      style={{ overflow: 'hidden', borderColor: euiTheme.colors.borderBaseSubdued }}
      data-test-subj="managedIntegrationsSection"
    >
      <button
        type="button"
        css={headerButtonCss}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((v) => !v)}
        data-test-subj="managedIntegrationsSection-headerButton"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="package" size="m" color="subdued" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.title"
                  defaultMessage="Managed Integrations"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.servicesLink"
                defaultMessage="{count, plural, one {# service} other {# services}}"
                values={{ count: serviceCount }}
              />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </button>

      {isOpen && (
        <div id={contentId} role="region">
          <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.description"
                  defaultMessage="Utilize AWS Access Keys or Federated Identity to set up and deploy your AWS account. Refer to our {gettingStartedLink} for details."
                  values={{
                    gettingStartedLink: (
                      <EuiLink target="_blank" external>
                        <FormattedMessage
                          id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.gettingStartedLink"
                          defaultMessage="Getting Started"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>

            {showIdentityFederation && (
              <>
                <EuiSpacer size="m" />
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.preferredMethodLabel"
                      defaultMessage="Preferred method"
                    />
                  }
                >
                  <EuiRadioGroup
                    options={radioOptions}
                    idSelected={preferredMethod}
                    onChange={(id) => setPreferredMethod(id as PreferredMethod)}
                    data-test-subj="managedIntegrationsSection-preferredMethodRadio"
                  />
                </EuiFormRow>
              </>
            )}

            <EuiSpacer size="m" />

            {preferredMethod === 'identity_federation' ? (
              <IdentityFederationForm />
            ) : (
              <AccessKeysForm />
            )}

            <EuiSpacer size="m" />

            <EuiButton data-test-subj="managedIntegrationsSection-deployButton">
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.deployButton"
                defaultMessage="Deploy integrations"
              />
            </EuiButton>
          </EuiPanel>
        </div>
      )}
    </EuiPanel>
  );
}
