/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { sendGetCloudOnboardingDeployment } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { DetectAndReviewStepState } from '../../onboarding_flow_context';
import type { ServiceSettingsPersistedState } from '../service_settings_step/use_service_settings';
import { detectServiceVarsDrift, detectAuthDrift, detectAgentPoliciesDrift } from './detect_drift';
import { toSOAuthMethod } from './agent_based_section/credential_method_selector';

interface UseOnboardingDriftDetectionParams {
  onboardingDeploymentId: string | undefined;
  policyIdsByInstance: Record<string, string> | null | undefined;
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined;
  deploymentMethod: string;
  authMethod: string | undefined;
  connectorId: string | undefined;
  agentBasedDeployment: {
    agentCredentialMethod: string;
    agentHostsMode: string;
    agentPolicyId?: string;
    selectedAgentPolicyIds: string[];
  };
  serviceSettings: ServiceSettingsPersistedState | null | undefined;
  isDirty: boolean;
  updateDetectAndReviewStep: (update: Partial<DetectAndReviewStepState>) => void;
}

export interface UseOnboardingDriftDetectionResult {
  driftSettled: boolean;
  driftCheckError: boolean;
  retryDriftCheck: () => void;
  handleReplaceFormDirtyChange: (replaceFormDirty: boolean) => void;
}

export function useOnboardingDriftDetection({
  onboardingDeploymentId,
  policyIdsByInstance,
  awsServicesMap,
  deploymentMethod,
  authMethod,
  connectorId,
  agentBasedDeployment,
  serviceSettings,
  isDirty,
  updateDetectAndReviewStep,
}: UseOnboardingDriftDetectionParams): UseOnboardingDriftDetectionResult {
  // SO-derived dirty result — merged by the replace-form cancel handler without re-fetching.
  const driftDirtyRef = useRef(false);
  // Replace-form dirty — merged with SO-derived dirty so a clean SO doesn't clear isDirty
  // while the user has unsaved keys in the static-key form.
  const replaceFormDirtyRef = useRef(false);
  // Sequence counter to discard stale drift fetch responses.
  const driftCheckIdRef = useRef(0);
  // false until drift check resolves — gates Next. true for fresh deploys (no SO to check).
  const [driftSettled, setDriftSettled] = useState(!onboardingDeploymentId);
  const [driftCheckError, setDriftCheckError] = useState(false);
  const [driftRetryKey, setDriftRetryKey] = useState(0);

  // Stable key for selectedAgentPolicyIds so the drift effect re-runs when policy selection
  // changes in agent-based edit mode. Gated to agent_based: MI SOs never store
  // agentPolicyIds, so a leftover selection from a prior agent-based session would falsely mark
  // an unchanged MI deployment dirty on every visit.
  const selectedAgentPoliciesKey =
    deploymentMethod === 'agent_based'
      ? agentBasedDeployment.selectedAgentPolicyIds.slice().sort().join(',')
      : '';

  useEffect(() => {
    const thisId = ++driftCheckIdRef.current;
    // Nothing to fetch — leave driftSettled unchanged (already true for fresh deploys; remains
    // false for edit mode while awsServicesMap is still loading, allowing it to settle once the
    // effect re-runs with a loaded map).
    if (!onboardingDeploymentId || awsServicesMap === undefined) return;
    setDriftSettled(false);
    setDriftCheckError(false);
    sendGetCloudOnboardingDeployment(onboardingDeploymentId)
      .then(({ item }) => {
        if (thisId !== driftCheckIdRef.current) return; // stale response — discard
        if (!item) {
          // SO does not exist or was cleared — nothing to compare against; treat as clean.
          setDriftSettled(true);
          return;
        }
        // policyIdsByInstance is captured from the closure: it is hydrated at mount from the SO
        // (same as serviceVars) and does not change during the component's lifetime at Step 3.
        // Filter against currently selected instances: policyIdsByInstance may include stale entries
        // for deselected services that are cleanup targets, not drift subjects.
        const selectedInstanceIdSet = new Set(
          serviceSettings?.instances?.map((i) => i.instanceId) ?? []
        );
        const deployedInstanceIds = new Set(
          Object.keys(policyIdsByInstance ?? {}).filter((id) => selectedInstanceIdSet.has(id))
        );
        const dirtyVarIds = detectServiceVarsDrift(
          serviceSettings?.serviceVars ?? {},
          (item.serviceVars ?? {}) as Record<string, Record<string, unknown>>,
          awsServicesMap,
          deployedInstanceIds
        );
        // Agent-based: use agentCredentialMethod (canonical UI state) so an unchanged return
        // to Step 3 doesn't falsely report auth drift (authMethod not written to session).
        const sessionAuthMethod =
          deploymentMethod === 'agent_based'
            ? toSOAuthMethod(agentBasedDeployment.agentCredentialMethod)
            : authMethod;
        const authDirty = detectAuthDrift(
          { authMethod: sessionAuthMethod, connectorId },
          { authMethod: item.authMethod, connectorId: item.connectorId }
        );
        const agentPoliciesDirty = detectAgentPoliciesDrift(
          {
            deploymentMethod,
            agentHostsMode: agentBasedDeployment.agentHostsMode,
            agentPolicyId: agentBasedDeployment.agentPolicyId,
            selectedAgentPolicyIds: agentBasedDeployment.selectedAgentPolicyIds,
          },
          { agentPolicyIds: item.agentPolicyIds }
        );
        const dirty = dirtyVarIds.length > 0 || authDirty || agentPoliciesDirty;
        driftDirtyRef.current = dirty;
        // Merge with replace-form dirty: a clean SO result still clears isDirty when the form
        // hasn't been touched.
        updateDetectAndReviewStep({
          isDirty: dirty || replaceFormDirtyRef.current,
          isAuthDirty: authDirty,
        });
        // Settle only after a successful compare. A failed or empty fetch leaves driftSettled=false
        // so Next stays blocked rather than enabling with a stale (default false) isDirty value.
        setDriftSettled(true);
      })
      .catch(() => {
        if (thisId !== driftCheckIdRef.current) return;
        setDriftCheckError(true);
      });
    // serviceSettings.serviceVars and globalRegion are intentionally captured from the closure:
    // service-var and region changes come from Step 2 navigation (full remount), not same-step
    // edits. Auth mutations (connector swap, authMethod, agentCredentialMethod) and agent-based
    // mode changes (agentHostsMode, policy selection) happen in this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onboardingDeploymentId,
    awsServicesMap,
    authMethod,
    connectorId,
    selectedAgentPoliciesKey,
    driftRetryKey,
    agentBasedDeployment?.agentCredentialMethod,
    agentBasedDeployment?.agentHostsMode,
    agentBasedDeployment?.agentPolicyId,
  ]);

  // Sync driftDirtyRef with isDirty so a successful deploy (which clears isDirty) also resets the
  // ref — otherwise the stale pre-deploy value merges with StaticKeysReplaceView's onReadyChange(false).
  useEffect(() => {
    if (!isDirty) {
      driftDirtyRef.current = false;
      replaceFormDirtyRef.current = false;
    }
  }, [isDirty]);

  const retryDriftCheck = useCallback(() => {
    setDriftCheckError(false);
    setDriftRetryKey((k) => k + 1);
  }, []);

  // Called when the static-key replace form becomes ready or is cancelled — merges form dirty
  // with SO-derived drift so cancelling correctly clears the callout when no service-var drift.
  const handleReplaceFormDirtyChange = useCallback(
    (replaceFormDirty: boolean) => {
      replaceFormDirtyRef.current = replaceFormDirty;
      updateDetectAndReviewStep({ isDirty: replaceFormDirty || driftDirtyRef.current });
    },
    [updateDetectAndReviewStep]
  );

  return {
    driftSettled,
    driftCheckError,
    retryDriftCheck,
    handleReplaceFormDirtyChange,
  };
}
