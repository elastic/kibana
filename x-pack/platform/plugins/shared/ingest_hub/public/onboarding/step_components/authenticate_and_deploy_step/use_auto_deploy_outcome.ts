/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { sendGetCloudOnboardingDeployment } from '@kbn/fleet-plugin/public';
import type { ProvisioningCallbackDeployOutcome } from '@kbn/fleet-plugin/public';

import type { DetectAndReviewStepState } from '../../onboarding_flow_context';
import { buildInstanceStatuses } from './deploy_groups';
import type { DeployGroup } from './deploy_groups';

export interface UseAutoDeployOutcomeParams {
  deployGroups: DeployGroup[];
  updateDetectAndReviewStep: (update: Partial<DetectAndReviewStepState>) => void;
  persistDeploymentId: (deploymentId: string) => void;
  setFailedInstances: (instanceIds: string[]) => void;
}

export interface UseAutoDeployOutcomeResult {
  /** Applies what the server deployed, exactly as a successful Deploy click would have. */
  applyOutcome: (outcome: ProvisioningCallbackDeployOutcome) => Promise<void>;
}

/**
 * Brings the flow to the state a Deploy click leaves it in, from a deploy the server ran after
 * the stack reported back: per-service statuses and policy ids from the deployment object, the
 * failed services for the retry path, and the deployment id in the URL now that edit mode is
 * right.
 */
export function useAutoDeployOutcome({
  deployGroups,
  updateDetectAndReviewStep,
  persistDeploymentId,
  setFailedInstances,
}: UseAutoDeployOutcomeParams): UseAutoDeployOutcomeResult {
  const applyOutcome = useCallback(
    async (outcome: ProvisioningCallbackDeployOutcome) => {
      const targets = deployGroups.flatMap((group) => group.instanceIds);
      let policyIdsByInstance: Record<string, string> = {};
      let message = outcome.error;
      try {
        const { item } = await sendGetCloudOnboardingDeployment(outcome.onboardingDeploymentId);
        policyIdsByInstance = item.policyIdsByInstance ?? {};
        message = item.statusMessage ?? message;
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      const failedInstances = targets.filter((instanceId) => !(instanceId in policyIdsByInstance));
      const deployErrors = Object.fromEntries(
        failedInstances.map((instanceId) => [instanceId, message ?? 'Deploy failed'])
      );

      updateDetectAndReviewStep({
        isDeploying: false,
        serviceStatuses: buildInstanceStatuses(targets, failedInstances, 'detecting'),
        policyIdsByInstance,
        failedInstances,
        deployErrors,
        // The deployment id is in the flow from Launch, so the drift check re-ran the moment the
        // identity was created, against a deployment the server had not written the connector
        // to yet, and marked the session dirty. The finished deploy holds exactly what the
        // session holds, and the id does not change, so nothing else would clear that.
        isDirty: false,
        isAuthDirty: false,
        isPolicySelectionDirty: false,
      });
      setFailedInstances(failedInstances);
      persistDeploymentId(outcome.onboardingDeploymentId);
    },
    [deployGroups, updateDetectAndReviewStep, persistDeploymentId, setFailedInstances]
  );

  return { applyOutcome };
}
