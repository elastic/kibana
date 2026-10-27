/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { PendingAgentlessPolicy } from '@kbn/fleet-plugin/common/types/models/cloud_onboarding_deployment';

import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { ServiceSettingsPersistedState } from '../service_settings_step/use_service_settings';
import { buildAgentlessPolicyRequest } from './deploy_groups';
import type { DeployGroup } from './deploy_groups';
import { DEFAULT_NAMESPACE } from './deploy_group_helpers';
import { toSOServiceVars } from './package_inputs';
import { toSOSettings } from './so_settings';
import { useOnboardingSO } from './use_onboarding_so';

export interface UseLaunchDeployIntentParams {
  deployGroups: DeployGroup[];
  serviceSettings: ServiceSettingsPersistedState | null | undefined;
  hasEcfServices: boolean;
}

export interface UseLaunchDeployIntentResult {
  /** True when a launch may deploy automatically: a first, create-only run. */
  canAutoDeploy: boolean;
  /**
   * Builds the agentless-policy requests the Deploy button would send, stores them on a new
   * pending onboarding deployment, records its id in the flow state and returns it. Undefined when
   * the deploy cannot be automatic or the deployment could not be created; the launch then
   * proceeds without one and the Deploy button stays.
   */
  prepareLaunch: () => Promise<{ onboardingDeploymentId: string } | undefined>;
}

/**
 * Captures, at Launch, what the Deploy button would deploy, so the server can do it once the
 * stack has reported back. Only a first, create-only run qualifies: a resumed or edited session
 * also updates, cleans up or merges policies, which the server does not do.
 */
export function useLaunchDeployIntent({
  deployGroups,
  serviceSettings,
  hasEcfServices,
}: UseLaunchDeployIntentParams): UseLaunchDeployIntentResult {
  const location = useLocation();
  const { detectAndReviewStep, updateDetectAndReviewStep, servicesStep, awsServicesMap } =
    useOnboardingFlow();
  const { createDeployment } = useOnboardingSO();

  const canAutoDeploy = useMemo(() => {
    if (deployGroups.length === 0) return false;
    // `?deploymentId=` means edit mode throughout the flow.
    if (new URLSearchParams(location.search).has('deploymentId')) return false;
    if (detectAndReviewStep.onboardingDeploymentId) return false;
    if (Object.keys(detectAndReviewStep.pendingCleanupPolicyIds ?? {}).length > 0) return false;
    const policyIdsByInstance = detectAndReviewStep.policyIdsByInstance ?? {};
    return !deployGroups.some((group) =>
      group.instanceIds.some((instanceId) => instanceId in policyIdsByInstance)
    );
  }, [
    deployGroups,
    location.search,
    detectAndReviewStep.onboardingDeploymentId,
    detectAndReviewStep.pendingCleanupPolicyIds,
    detectAndReviewStep.policyIdsByInstance,
  ]);

  const prepareLaunch = useCallback(async () => {
    if (!canAutoDeploy) {
      return undefined;
    }
    const globalRegion = serviceSettings?.globalRegion ?? '';
    const integrationName = serviceSettings?.integrationName?.trim() || undefined;
    const description = serviceSettings?.description?.trim() || undefined;
    const storedServiceVars = serviceSettings?.serviceVars ?? {};
    const pendingAgentlessPolicies: PendingAgentlessPolicy[] = await Promise.all(
      deployGroups.map(async (group) => ({
        // Pre-assigned so the server finds the policy again if it has to retry.
        id: uuidv4(),
        instanceIds: group.instanceIds,
        request: await buildAgentlessPolicyRequest(group, {
          namespace: DEFAULT_NAMESPACE,
          globalRegion,
          storedServiceVars,
          integrationName,
          description,
          // No connector yet: the stack creates it, and the server fills it in.
          authenticateAndDeployStep: {},
        }),
      }))
    );

    const onboardingDeploymentId = await createDeployment({
      provider: 'aws',
      mechanisms: hasEcfServices ? ['managed_integration', 'ecf'] : ['managed_integration'],
      services: servicesStep.selectedServiceIds,
      serviceVars: toSOServiceVars(storedServiceVars, awsServicesMap ?? new Map()) as Record<
        string,
        Record<string, unknown>
      >,
      globalRegion,
      ...toSOSettings(serviceSettings),
      dataFormat: servicesStep.dataFormat,
      authMethod: 'identity_federation',
      pendingAgentlessPolicies,
    });
    if (!onboardingDeploymentId) {
      return undefined;
    }
    // In the flow state only: the URL parameter would switch the flow into edit mode.
    updateDetectAndReviewStep({ onboardingDeploymentId });
    return { onboardingDeploymentId };
  }, [
    canAutoDeploy,
    deployGroups,
    serviceSettings,
    hasEcfServices,
    servicesStep.selectedServiceIds,
    servicesStep.dataFormat,
    awsServicesMap,
    createDeployment,
    updateDetectAndReviewStep,
  ]);

  return { canAutoDeploy, prepareLaunch };
}
