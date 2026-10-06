/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { sendGetCloudOnboardingDeployment } from '@kbn/fleet-plugin/public';

import {
  toSOAuthMethod,
  type AgentCredentialMethod,
} from './agent_based_section/credential_method_selector';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { DetectAndReviewStepState } from '../../onboarding_flow_context';
import type { ServiceSettingsPersistedState } from '../service_settings_step/use_service_settings';
import { detectServiceVarsDrift, detectAuthDrift, detectAgentPoliciesDrift } from './detect_drift';

interface UseOnboardingDriftDetectionParams {
  onboardingDeploymentId: string | undefined;
  policyIdsByInstance: Record<string, string> | null | undefined;
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined;
  deploymentMethod: string;
  connectorId: string | undefined;
  agentBasedDeployment: {
    agentCredentialMethod: AgentCredentialMethod | undefined;
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

  // Readiness key for the only matrix entries drift compares: deployed, still-selected instances.
  // awsServicesMap is rebuilt whenever any of the ten AWS package queries resolves, so keying the
  // effect on the Map restarted the check on manifest arrivals it never reads — re-fetching the SO
  // and unmounting the error callout, with its Retry button, while the user was acting on it.
  const policyInstanceIds = Object.keys(policyIdsByInstance ?? {});
  const comparedManifestsSettled =
    awsServicesMap !== undefined &&
    (serviceSettings?.instances ?? []).every(({ instanceId, serviceId }) => {
      if (!policyInstanceIds.includes(instanceId)) return true;
      const entry = awsServicesMap.get(serviceId);
      return !entry || entry.isManifestLoaded || entry.isManifestError;
    });

  useEffect(() => {
    let cancelled = false;
    const thisId = ++driftCheckIdRef.current;
    // Nothing to fetch — leave driftSettled unchanged (already true for fresh deploys; remains
    // false for edit mode while awsServicesMap is still loading, allowing it to settle once the
    // effect re-runs with a loaded map).
    if (!onboardingDeploymentId || awsServicesMap === undefined) return;
    setDriftSettled(false);
    sendGetCloudOnboardingDeployment(onboardingDeploymentId)
      .then(({ item }) => {
        // cancelled guards against unmount (step navigated away); thisId guards against a
        // newer effect run superseding this one within the same hook instance.
        if (cancelled || thisId !== driftCheckIdRef.current) return;
        // Cleared here, not before the fetch: an up-front reset unmounted the callout — and its
        // Retry button — before the re-check had a result.
        setDriftCheckError(false);
        if (!item) {
          // SO does not exist or was cleared — nothing to compare against; treat as clean.
          // Also clear persisted drift flags so stale session state doesn't re-trigger callout.
          setDriftSettled(true);
          updateDetectAndReviewStep({
            isDirty: false,
            isAuthDirty: false,
            isPolicySelectionDirty: false,
          });
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
        // Agent-based: compare credential method (instance_profile / access_keys / etc.) against
        // the SO authMethod. MI auth method is locked in edit mode so only connector drift applies.
        const authDirty =
          deploymentMethod === 'agent_based'
            ? toSOAuthMethod(agentBasedDeployment.agentCredentialMethod) !==
              (item.authMethod ?? undefined)
            : detectAuthDrift({ connectorId }, { connectorId: item.connectorId });
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
          isPolicySelectionDirty: agentPoliciesDirty,
        });
        // Settle only after a successful compare. A failed or empty fetch leaves driftSettled=false
        // so Next stays blocked rather than enabling with a stale (default false) isDirty value.
        setDriftSettled(true);
      })
      .catch(() => {
        if (cancelled || thisId !== driftCheckIdRef.current) return;
        setDriftCheckError(true);
      });
    return () => {
      cancelled = true;
    };
    // awsServicesMap is captured from the closure, standing in the deps as comparedManifestsSettled.
    // serviceSettings.serviceVars and globalRegion are intentionally captured from the closure:
    // service-var and region changes come from Step 2 navigation (full remount), not same-step
    // edits. Auth mutations (MI: connector swap; agent-based: credential method) and agent-based
    // mode changes (agentHostsMode, policy selection) happen in this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onboardingDeploymentId,
    comparedManifestsSettled,
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
