/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

import { useOnboardingFlow } from '../onboarding_flow_context';
import { DeploymentMethodCard } from './authenticate_and_deploy_step/deployment_method_card';
import { ManagedIntegrationsSection } from './authenticate_and_deploy_step/managed_integrations_section';
import { useDeploy } from './authenticate_and_deploy_step/use_deploy';
import { useAgentBasedDeploy } from './authenticate_and_deploy_step/use_agent_based_deploy';
import { AgentBasedSection } from './authenticate_and_deploy_step/agent_based_section';
import { useEcfDeployment, EcfDeploymentSection } from './ecf_deployment_section';
import {
  SERVICE_SETTINGS_SESSION_KEY,
  type ServiceSettingsPersistedState,
} from './service_settings_step/use_service_settings';

const DEFAULT_SERVICE_SETTINGS: ServiceSettingsPersistedState = {
  globalRegion: '',
  serviceVars: {},
};

interface AuthenticateAndDeployStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function AuthenticateAndDeployStep({ onContinue, onBack }: AuthenticateAndDeployStepProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudStart }>();
  const { servicesStep, awsServicesMap, detectAndReviewStep } = useOnboardingFlow();
  const { selectedServiceIds, dataFormat } = servicesStep;

  const { deploymentMethod, setDeploymentMethod } = useOnboardingFlow();

  // ── Service settings (region + vars) ─────────────────────────────────────────
  // Read from session storage so ECF URLs can be pre-filled without re-entering data.
  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );
  const { globalRegion, serviceVars } = serviceSettings ?? DEFAULT_SERVICE_SETTINGS;

  const otlpEndpoint = services.cloud?.managedOtlp?.url;

  // ECF instances: prefer session-storage instances because they carry duplicate-instance ARNs
  // (multi-bucket / multi-log-group configs from Step 2). Fall back to one base instance per
  // selected service when session storage hasn't been written yet — e.g. the user jumped to
  // Step 3 directly via the horizontal step indicator without clicking Next in Step 2.
  const ecfInstances = useMemo(() => {
    const stored = serviceSettings?.instances;
    if (stored && stored.length > 0) return stored;
    return selectedServiceIds.flatMap((id) => {
      const service = awsServicesMap?.get(id);
      if (!service?.showInUI) return [];
      return [{ instanceId: id, serviceId: id, name: service.name, isDuplicate: false }];
    });
  }, [serviceSettings?.instances, selectedServiceIds, awsServicesMap]);

  // ── Managed Integrations ──────────────────────────────────────────────────────
  const { handleDeploy, isDeploying, failedInstances, isAlreadyDeployed } = useDeploy({
    onContinue: () => {},
  });
  const [deployAttempted, setDeployAttempted] = useState(false);
  const isMiDone =
    isAlreadyDeployed || (deployAttempted && !isDeploying && failedInstances.length === 0);
  // hasFailed is NOT gated on deployAttempted: if the hook is seeded with persisted failures on
  // remount (after navigating Back/Next), the callout and Retry must still appear even though no
  // deploy was attempted in this component lifetime.
  const hasFailed = !isDeploying && failedInstances.length > 0;

  const handleDeployClick = useCallback(() => {
    setDeployAttempted(true);
    if (failedInstances.length > 0) {
      handleDeploy(failedInstances);
    } else {
      handleDeploy();
    }
  }, [handleDeploy, failedInstances]);

  const isAgentBased = deploymentMethod === 'agent_based';

  const miServiceIds = useMemo(
    () =>
      isAgentBased
        ? [] // suppress MI section in agent-based mode
        : selectedServiceIds.filter((id) =>
            awsServicesMap
              ?.get(id)
              ?.deploymentMethods.some((dm) => dm.method === 'managed_integration')
          ),
    [isAgentBased, selectedServiceIds, awsServicesMap]
  );

  // ── Agent-based ─────────────────────────────────────────────────────────────
  const {
    targets: agentTargets,
    isDeploying: isAgentDeploying,
    failedInstances: agentFailedInstances,
    isAlreadyDeployed: isAgentAlreadyDeployed,
    handleDeploy: handleAgentDeploy,
    setAgentCredentials,
  } = useAgentBasedDeploy();

  const [agentDeployAttempted, setAgentDeployAttempted] = useState(false);
  const isAgentDone =
    isAgentAlreadyDeployed ||
    (agentDeployAttempted && !isAgentDeploying && agentFailedInstances.length === 0);
  // Unlike MI's hasFailed, this IS gated on agentDeployAttempted. failedInstances is a single
  // shared session key that the MI path also writes, so an un-gated check would surface a stale
  // MI failure (or one from a previous session) as an agent-based "Deployment failed" callout.
  // The agent-based path has no equivalent of MI's "persisted failure must survive remount"
  // requirement, because agentPolicyId is its durable success flag.
  const agentHasFailed =
    agentDeployAttempted && !isAgentDeploying && agentFailedInstances.length > 0;

  const handleAgentDeployClick = useCallback(
    (instanceIds?: string[]) => {
      setAgentDeployAttempted(true);
      if (instanceIds && instanceIds.length > 0) {
        handleAgentDeploy(instanceIds);
      } else {
        handleAgentDeploy();
      }
    },
    [handleAgentDeploy]
  );

  const showIdentityFederation = useMemo(() => {
    if (miServiceIds.length === 0) return true;
    return miServiceIds.every(
      (id) => awsServicesMap?.get(id)?.identityFederationSupported !== false
    );
  }, [miServiceIds, awsServicesMap]);

  // ── Elastic Cloud Forwarder ───────────────────────────────────────────────────
  // ECF is suppressed in agent-based mode — agent-based services are deployed via the agent policy,
  // not via CloudFormation. Passing an empty instance list makes useEcfDeployment return
  // hasAnyEcf=false so the section is hidden and Next is not gated on ECF completion.
  const {
    hasAnyEcf,
    isDone: isEcfDone,
    sectionProps: ecfSectionProps,
  } = useEcfDeployment({
    instances: isAgentBased ? [] : ecfInstances,
    serviceVars,
    globalRegion,
    otlpEndpoint,
    dataFormat,
  });

  // ── Next button gating ────────────────────────────────────────────────────────
  // Disabled until every active deployment section reports done.
  // Agent-based is intentionally not gated on agent enrollment — the flyout is fire-and-forget
  // and AgentSetupCallout already says "This won't stop you from continuing."
  const showMiSection = !isAgentBased && miServiceIds.length > 0;
  const showAgentSection = isAgentBased && agentTargets.length > 0;
  // Agent-based deploy is non-blocking — user can proceed to Step 4 without waiting for deploy
  // or agent enrollment. Data detection and the service chips are shown in Step 4 instead.
  const isNextDisabled = (showMiSection && !isMiDone) || (hasAnyEcf && !isEcfDone);

  return (
    <div data-test-subj="onboardingStep-authenticate-and-deploy">
      <DeploymentMethodCard selectedMethod={deploymentMethod} onChange={setDeploymentMethod} />

      {showMiSection && <EuiHorizontalRule margin="l" />}

      {showMiSection && (
        <ManagedIntegrationsSection
          serviceCount={miServiceIds.length}
          showIdentityFederation={showIdentityFederation}
          onDeploy={handleDeployClick}
          isDeploying={isDeploying}
          isDone={isMiDone}
          hasFailed={hasFailed}
        />
      )}

      {showAgentSection && <EuiHorizontalRule margin="l" />}

      {showAgentSection && (
        <AgentBasedSection
          serviceCount={agentTargets.length}
          onDeploy={handleAgentDeployClick}
          onCredentialsChange={setAgentCredentials}
          isDeploying={isAgentDeploying}
          isDone={isAgentDone}
          hasFailed={agentHasFailed}
          failedInstances={agentFailedInstances}
          deployErrors={detectAndReviewStep.deployErrors}
        />
      )}

      {hasAnyEcf && <EuiHorizontalRule margin="l" />}

      {hasAnyEcf && <EcfDeploymentSection {...ecfSectionProps} />}

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {onBack && (
            <EuiButtonEmpty iconType="chevronSingleLeft" iconSide="left" onClick={onBack}>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.backButton"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={onContinue}
            isDisabled={isNextDisabled}
            data-test-subj="authenticateAndDeployStep-nextButton"
          >
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.nextButton"
              defaultMessage="Next"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
