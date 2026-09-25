/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocation } from 'react-router-dom';
import {
  LazyAwsIdentityFederationSetup,
  LazyAwsStaticKeysForm,
  useGetPackageInfoByKeyQuery,
  getAnyCloudConnectorIacTemplateUrl,
} from '@kbn/fleet-plugin/public';
import type {
  AwsStaticKeyCredentials,
  CloudSetupForCloudConnector,
  IacRenderedTemplate,
  IacTemplateLaunchedFor,
  RenderIacTemplateIntegration,
} from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { StaticKeysReplaceView } from './static_keys_replace_view';

type PreferredMethod = 'identity_federation' | 'access_keys';

interface ManagedIntegrationsSectionProps {
  serviceCount: number;
  showIdentityFederation: boolean;
  /**
   * Integration set the Federated Identity must cover (built by buildIacIntegrations). Fleet renders
   * the CloudFormation template for exactly this set and gates readiness on it.
   */
  iacIntegrations: RenderIacTemplateIntegration[];
  onDeploy: () => void;
  isDeploying: boolean;
  isDone: boolean;
  hasFailed: boolean;
  /** When true, Deploy only runs cleanup (Fleet API calls) — AWS credentials are not required. */
  isCleanupOnly?: boolean;
  /**
   * When true, settings have drifted from the last deploy. With an existing identity-federation
   * connector the Deploy button is enabled immediately — credentials were already validated by the
   * previous deploy and the connector is still the same. This bypasses the form's async
   * re-validation window which would otherwise disable the button on section re-open.
   */
  isDirty?: boolean;
}

export function ManagedIntegrationsSection({
  serviceCount,
  showIdentityFederation,
  iacIntegrations,
  onDeploy,
  isDeploying,
  isDone,
  hasFailed,
  isCleanupOnly = false,
  isDirty = false,
}: ManagedIntegrationsSectionProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudSetupForCloudConnector }>();
  const {
    setConnectorId,
    setStaticKeys,
    setPendingIacTemplate,
    authenticateAndDeployStep,
    updateDetectAndReviewStep,
  } = useOnboardingFlow();
  const { connectorId: initialConnectorId } = authenticateAndDeployStep;

  // The Existing Identity check renders the stack update without writing the key; the template
  // details are parked on the flow and written to the connector after Deploy succeeds. They are
  // tagged with the identity and the integration set the render was launched for, not the ones
  // current when it lands: the render is asynchronous and the user may have switched identities
  // or changed the enabled inputs meanwhile. Deploy only writes the parked details when both
  // match what it deploys.
  const handleIacTemplateRecorded = useCallback(
    (iac: IacRenderedTemplate, { cloudConnectorId, integrations }: IacTemplateLaunchedFor) => {
      setPendingIacTemplate({
        connectorId: cloudConnectorId,
        integrationsKey: JSON.stringify(integrations),
        ...iac,
      });
    },
    [setPendingIacTemplate]
  );
  const location = useLocation();
  const isEditMode = new URLSearchParams(location.search).has('deploymentId');
  const isStaticKeysEditMode = isEditMode && authenticateAndDeployStep.authMethod === 'static_keys';
  const { euiTheme } = useEuiTheme();
  const contentId = useGeneratedHtmlId({ prefix: 'managedIntegrationsContent' });
  const [isOpen, setIsOpen] = useState(!isDone);
  const [preferredMethod, setPreferredMethod] = useState<PreferredMethod>(
    isStaticKeysEditMode
      ? 'access_keys'
      : showIdentityFederation
      ? 'identity_federation'
      : 'access_keys'
  );

  useEffect(() => {
    if (!showIdentityFederation && preferredMethod === 'identity_federation') {
      setPreferredMethod('access_keys');
    }
  }, [showIdentityFederation, preferredMethod]);

  useEffect(() => {
    if (isDone) setIsOpen(false);
    else setIsOpen(true); // Re-open when drift is detected (isDone reverts from true to false).
  }, [isDone]);

  // Re-seed from session so the user doesn't have to re-enter credentials they already provided
  // (e.g. after navigating Back/Forward or adding a new service without changing auth).
  // isStaticKeysEditMode intentionally skips the seed: the replace-flow requires new credentials.
  // Identity federation with an existing connector is ready immediately — the form calls
  // onReadyChange(false) if the connector turns out to be broken.
  const [isDeployReady, setIsDeployReady] = useState(() => {
    if (isStaticKeysEditMode) return false;
    if (authenticateAndDeployStep.connectorId) return true;
    const keys = authenticateAndDeployStep.staticKeys;
    return Boolean(keys?.access_key_id && keys?.secret_access_key);
  });
  // Tracks whether the connector that was in session at (or after) initial mount is still the
  // active one — i.e. the user has not picked a different connector since the page loaded.
  // Used to: (a) suppress transient onReadyChange(false) from the identity federation form while
  // it re-validates an already-known-good connector, and (b) drive the isDirty bypass on the
  // Deploy button. Both are reset when the user actively selects a new connector or switches
  // auth method, so a freshly-chosen connector always requires form validation before Deploy.
  const connectorPreloaded = useRef(!!initialConnectorId && !isStaticKeysEditMode);
  // Reactive mirror of connectorPreloaded for use in JSX (refs can't drive rendering).
  const [isConnectorPreloaded, setIsConnectorPreloaded] = useState(
    !!initialConnectorId && !isStaticKeysEditMode
  );
  // Track whether the user has actively changed the connector so the useEffect below can
  // distinguish hydration (should restore preloaded state) from a user pick (should not).
  const userChangedConnector = useRef(false);
  // After session hydration the parent re-renders with a populated connectorId. If the component
  // mounted before hydration (connectorId was undefined) we need to set the preloaded flag now.
  useEffect(() => {
    if (initialConnectorId && !isStaticKeysEditMode && !userChangedConnector.current) {
      connectorPreloaded.current = true;
      setIsConnectorPreloaded(true);
    }
  }, [initialConnectorId, isStaticKeysEditMode]);

  const handleIdentityFedReadyChange = useCallback((ready: boolean) => {
    if (connectorPreloaded.current && !ready) return;
    setIsDeployReady(ready);
  }, []);

  const handleIdentityFedConnectorChange = useCallback(
    (id: string | undefined, name?: string) => {
      userChangedConnector.current = true;
      connectorPreloaded.current = false;
      setIsConnectorPreloaded(false);
      setConnectorId(id, name);
    },
    [setConnectorId]
  );

  const handleStaticKeysChange = useCallback(
    (fields: AwsStaticKeyCredentials | undefined) => {
      setStaticKeys(fields);
    },
    [setStaticKeys]
  );

  const handleStaticKeyReplaceReadyChange = useCallback(
    (ready: boolean) => {
      setIsDeployReady(ready);
      if (ready) updateDetectAndReviewStep({ isDirty: true });
    },
    [updateDetectAndReviewStep]
  );

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
                        userChangedConnector.current = true;
                        connectorPreloaded.current = false;
                        setIsConnectorPreloaded(false);
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
                  cloud={services.cloud}
                  iacTemplateUrl={iacTemplateUrl}
                  integrations={iacIntegrations}
                  onReadyChange={handleIdentityFedReadyChange}
                  onConnectorIdChange={handleIdentityFedConnectorChange}
                  onIacTemplateRecorded={handleIacTemplateRecorded}
                  initialConnectorId={initialConnectorId}
                />
              ) : isStaticKeysEditMode ? (
                <StaticKeysReplaceView
                  onReadyChange={handleStaticKeyReplaceReadyChange}
                  onFieldsChange={handleStaticKeysChange}
                />
              ) : (
                <LazyAwsStaticKeysForm
                  initialValues={authenticateAndDeployStep.staticKeys}
                  onReadyChange={setIsDeployReady}
                  onFieldsChange={handleStaticKeysChange}
                />
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
                isDisabled={
                  isDeploying ||
                  (
                    !isDeployReady &&
                    !isCleanupOnly &&
                    !(isDirty && preferredMethod === 'identity_federation' && isConnectorPreloaded) &&
                    !(
                      isDirty &&
                      isStaticKeysEditMode &&
                      !!(authenticateAndDeployStep.staticKeys?.access_key_id) &&
                      !!(authenticateAndDeployStep.staticKeys?.secret_access_key)
                    )
                  )
                }
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
