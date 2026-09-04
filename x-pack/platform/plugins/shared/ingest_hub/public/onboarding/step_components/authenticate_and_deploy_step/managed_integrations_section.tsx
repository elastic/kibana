/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  LazyAwsIdentityFederationSetup,
  LazyAwsStaticKeysForm,
  useGetPackageInfoByKeyQuery,
  getAnyCloudConnectorIacTemplateUrl,
} from '@kbn/fleet-plugin/public';
import type { CloudSetupForCloudConnector } from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';

type PreferredMethod = 'identity_federation' | 'access_keys';

interface ManagedIntegrationsSectionProps {
  serviceCount: number;
  showIdentityFederation: boolean;
  onDeploy: () => void;
  isDeploying: boolean;
  isDone: boolean;
  hasFailed: boolean;
}

export function ManagedIntegrationsSection({
  serviceCount,
  showIdentityFederation,
  onDeploy,
  isDeploying,
  isDone,
  hasFailed,
}: ManagedIntegrationsSectionProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudStart }>();
  const { setConnectorId } = useOnboardingFlow();
  const { euiTheme } = useEuiTheme();
  const contentId = useGeneratedHtmlId({ prefix: 'managedIntegrationsContent' });
  const [isOpen, setIsOpen] = useState(!isDone);
  const [preferredMethod, setPreferredMethod] = useState<PreferredMethod>(
    showIdentityFederation ? 'identity_federation' : 'access_keys'
  );

  useEffect(() => {
    if (!showIdentityFederation && preferredMethod === 'identity_federation') {
      setPreferredMethod('access_keys');
    }
  }, [showIdentityFederation, preferredMethod]);

  useEffect(() => {
    if (isDone) setIsOpen(false);
  }, [isDone]);

  const [isDeployReady, setIsDeployReady] = useState(false);

  const { data: awsPackageResponse } = useGetPackageInfoByKeyQuery(
    'aws',
    undefined,
    { full: true },
    { enabled: showIdentityFederation }
  );
  const iacTemplateUrl = useMemo(
    () => getAnyCloudConnectorIacTemplateUrl(awsPackageResponse?.item),
    [awsPackageResponse]
  );
  const cloud = services.cloud as CloudSetupForCloudConnector | undefined;

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
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.title"
                  defaultMessage="Managed Integrations"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          {isDone && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="success" iconType="check">
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.doneBadge"
                  defaultMessage="Done"
                />
              </EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.serviceCount"
                defaultMessage="{count, plural, one {# service} other {# services}}"
                values={{ count: serviceCount }}
              />
            </EuiText>
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
                    name="managedIntegrationsPreferredMethod"
                    options={radioOptions}
                    idSelected={preferredMethod}
                    onChange={(id) => {
                      setPreferredMethod(id as PreferredMethod);
                      setIsDeployReady(false);
                      if (id === 'access_keys') {
                        setConnectorId(undefined);
                      }
                    }}
                    data-test-subj="managedIntegrationsSection-preferredMethodRadio"
                  />
                </EuiFormRow>
              </>
            )}

            <EuiSpacer size="m" />

            <Suspense fallback={<EuiLoadingSpinner />}>
              {preferredMethod === 'identity_federation' ? (
                <LazyAwsIdentityFederationSetup
                  cloud={cloud}
                  iacTemplateUrl={iacTemplateUrl}
                  onReadyChange={setIsDeployReady}
                  onConnectorIdChange={setConnectorId}
                />
              ) : (
                <LazyAwsStaticKeysForm onReadyChange={setIsDeployReady} />
              )}
            </Suspense>

            <EuiSpacer size="m" />

            {hasFailed && !isDeploying && (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.errorCallout.title"
                    defaultMessage="Deployment failed"
                  />
                }
                color="danger"
                iconType="error"
                announceOnMount
                data-test-subj="managedIntegrationsSection-errorCallout"
              >
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.errorCallout.body"
                  defaultMessage="One or more integrations could not be deployed. Check your credentials and try again."
                />
                <EuiSpacer size="s" />
                <EuiButton
                  size="s"
                  color="danger"
                  onClick={onDeploy}
                  data-test-subj="managedIntegrationsSection-retryButton"
                >
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.retryButton"
                    defaultMessage="Retry"
                  />
                </EuiButton>
              </EuiCallOut>
            )}

            {isDone && (
              <EuiText size="s" data-test-subj="managedIntegrationsSection-successMessage">
                <p>
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.successMessage"
                    defaultMessage="Managed integrations deployed. Data detection is running in the background — check Detect & Review for arrival status."
                  />
                </p>
              </EuiText>
            )}

            {!hasFailed && !isDone && (
              <EuiButton
                isDisabled={!isDeployReady}
                isLoading={isDeploying}
                onClick={onDeploy}
                data-test-subj="managedIntegrationsSection-deployButton"
              >
                {isDeploying ? (
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.deployingButton"
                    defaultMessage="Deploying integrations..."
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.managedIntegrationsSection.deployButton"
                    defaultMessage="Deploy integrations"
                  />
                )}
              </EuiButton>
            )}
          </EuiPanel>
        </div>
      )}
    </EuiPanel>
  );
}
