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
import { buildIacIntegrations } from './authenticate_and_deploy_step/package_inputs';
import { useDeploy, toSOServiceVars } from './authenticate_and_deploy_step/use_deploy';
import { useAgentBasedDeploy } from './authenticate_and_deploy_step/use_agent_based_deploy';
import { AgentBasedSection } from './authenticate_and_deploy_step/agent_based_section';
import { useOnboardingSO } from './authenticate_and_deploy_step/use_onboarding_so';
import { useEcfDeployment, EcfDeploymentSection } from './ecf_deployment_section';
import {
  ECF_UNIFIED_STACK_NAME,
  ECF_OTEL_STACK_NAME,
  ECF_CROWDSTRIKE_STACK_NAME,
} from '../ecf_cloudformation';
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
  const {
    servicesStep,
    awsServicesMap,
    deploymentMethod,
    setDeploymentMethod,
    detectAndReviewStep,
    updateDetectAndReviewStep,
  } = useOnboardingFlow();
  const { selectedServiceIds, dataFormat } = servicesStep;
  const { createDeployment, updateDeployment, persistDeploymentId } = useOnboardingSO();

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
  const { handleDeploy, isDeploying, failedInstances, isAlreadyDeployed, deployGroups } = useDeploy(
    {
      onContinue: () => {},
    }
  );
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
  const [isAgentNextReady, setIsAgentNextReady] = useState(false);
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

  // Used by handleNext to await the deploy result and decide whether to navigate.
  const handleAgentDeployForNext = useCallback(async (): Promise<{ failed: boolean }> => {
    setAgentDeployAttempted(true);
    return handleAgentDeploy();
  }, [handleAgentDeploy]);

  const showIdentityFederation = useMemo(() => {
    if (miServiceIds.length === 0) return true;
    return miServiceIds.every(
      (id) => awsServicesMap?.get(id)?.identityFederationSupported !== false
    );
  }, [miServiceIds, awsServicesMap]);

  // The Federated Identity template must cover exactly the instances Deploy will create as
  // managed integrations, duplicates included.
  const iacIntegrations = useMemo(
    () =>
      buildIacIntegrations(
        deployGroups.flatMap((group) => group.members),
        serviceVars
      ),
    [deployGroups, serviceVars]
  );

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

  // ── ECF-only SO persistence ───────────────────────────────────────────────────
  const [isSavingSO, setIsSavingSO] = useState(false);

  // Defined before handleNext so they can be referenced in the callback and dependency array.
  const showMiSection = !isAgentBased && miServiceIds.length > 0;
  const showAgentSection = isAgentBased && agentTargets.length > 0;

  const handleNext = useCallback(async () => {
    const defaultNames: Record<string, string> = {
      unified: ECF_UNIFIED_STACK_NAME,
      otel: ECF_OTEL_STACK_NAME,
      crowdstrike: ECF_CROWDSTRIKE_STACK_NAME,
    };
    const ecfStacks = ecfSectionProps.launchedFamilies
      .map((family) => {
        const version = ecfSectionProps.stackVersions[family];
        if (!version) return null;
        return {
          family,
          stackName: ecfSectionProps.stackNames[family] || defaultNames[family],
          templateVersion: version,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const ecfStacksUnchanged =
      detectAndReviewStep.ecfStacks !== undefined &&
      JSON.stringify(ecfStacks) === JSON.stringify(detectAndReviewStep.ecfStacks);

    // ECF-only: handleDeploy never runs, so create the SO here then navigate.
    if (miServiceIds.length === 0 && hasAnyEcf) {
      setIsSavingSO(true);
      // Reuse an existing deployment id (user clicked Back then Next again) rather
      // than creating a second SO and orphaning the first.
      const existingId = detectAndReviewStep.onboardingDeploymentId;
      const deploymentId =
        existingId ??
        (await createDeployment({
          provider: 'aws',
          mechanisms: ['ecf'],
          services: selectedServiceIds,
          serviceVars: toSOServiceVars(serviceVars, awsServicesMap ?? new Map()) as Record<
            string,
            Record<string, unknown>
          >,
          globalRegion,
          dataFormat,
        }));

      setIsSavingSO(false);
      // Navigate first so onContinue uses the current history.location (not the stale closure
      // location). persistDeploymentId then replaces the already-navigated URL to add ?deploymentId=,
      // mirroring the order in useDeploy's handleDeploy for the managed-integration path.
      onContinue();
      if (deploymentId) {
        if (!ecfStacksUnchanged) {
          await updateDeployment(deploymentId, { status: 'succeeded', ecfStacks });
          updateDetectAndReviewStep({ ecfStacks });
        }
        if (!existingId) persistDeploymentId(deploymentId);
      }
      return;
    }

    // Mixed (MI + ECF): SO was created by handleDeploy with both mechanisms; update ecfStacks now.
    if (hasAnyEcf && detectAndReviewStep.onboardingDeploymentId) {
      onContinue();
      if (!ecfStacksUnchanged) {
        await updateDeployment(detectAndReviewStep.onboardingDeploymentId, { ecfStacks });
        updateDetectAndReviewStep({ ecfStacks });
      }
      return;
    }

    // Agent-based: deploy on Next, then navigate only if succeeded.
    if (showAgentSection) {
      // Short-circuit if already deployed (e.g. user went Back then Next again) to avoid
      // creating duplicate package policies on the same agent policy.
      if (isAgentDone) {
        onContinue();
        return;
      }
      const result = await handleAgentDeployForNext();
      if (result.failed) {
        // Deploy failed — stay on step 3, error callout is already shown by the section.
        return;
      }
      onContinue();
      return;
    }

    onContinue();
  }, [
    miServiceIds.length,
    hasAnyEcf,
    showAgentSection,
    isAgentDone,
    handleAgentDeployForNext,
    ecfSectionProps,
    selectedServiceIds,
    serviceVars,
    awsServicesMap,
    globalRegion,
    dataFormat,
    detectAndReviewStep.onboardingDeploymentId,
    detectAndReviewStep.ecfStacks,
    createDeployment,
    updateDeployment,
    persistDeploymentId,
    updateDetectAndReviewStep,
    onContinue,
  ]);

  // ── Next button gating ────────────────────────────────────────────────────────
  // Disabled until every active deployment section reports done.
  // Agent enrolment is non-blocking, but the deploy itself now happens here on Next.
  // The section stays visible with the error callout if deploy fails.
  const isNextDisabled =
    (showMiSection && !isMiDone) ||
    (hasAnyEcf && !isEcfDone) ||
    isSavingSO ||
    (showAgentSection && isAgentDeploying) ||
    (showAgentSection && !isAgentDone && !isAgentNextReady);

  return (
    <div data-test-subj="onboardingStep-authenticate-and-deploy">
      <DeploymentMethodCard selectedMethod={deploymentMethod} onChange={setDeploymentMethod} />

      {showMiSection && <EuiHorizontalRule margin="l" />}

      {showMiSection && (
        <ManagedIntegrationsSection
          serviceCount={miServiceIds.length}
          showIdentityFederation={showIdentityFederation}
          iacIntegrations={iacIntegrations}
          onDeploy={handleDeployClick}
          isDeploying={isDeploying}
          isDone={isMiDone}
          hasFailed={hasFailed}
        />
      )}

      {showAgentSection && <EuiHorizontalRule margin="l" />}

      {showAgentSection && (
        <AgentBasedSection
          serviceCount={agentTargets.reduce((sum, g) => sum + g.instanceIds.length, 0)}
          onDeploy={handleAgentDeployClick}
          onCredentialsChange={setAgentCredentials}
          onNextReadyChange={setIsAgentNextReady}
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
            onClick={handleNext}
            isDisabled={isNextDisabled}
            isLoading={isSavingSO || isAgentDeploying}
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
