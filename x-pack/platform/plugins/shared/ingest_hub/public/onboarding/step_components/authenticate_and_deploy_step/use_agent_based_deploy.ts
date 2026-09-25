/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { SERVICE_SETTINGS_SESSION_KEY } from '../service_settings_step/use_service_settings';
import type { ServiceSettingsPersistedState } from '../service_settings_step/use_service_settings';
import {
  buildAgentBasedTargets,
  deployNewAgentPolicy,
  deployToExistingAgentPolicies,
  buildAgentBasedInstanceStatuses,
  extractErrorMessage,
  buildAgentPolicyName,
} from './agent_based_deploy';
import type { AgentCredentialVars } from './package_inputs';
import { toSOServiceVars } from './package_inputs';
import type { DeployGroup } from './deploy_groups';
import { cleanupAgentBasedPolicies, updateAgentBasedPolicy } from './policy_cleanup_agent_based';
import { useOnboardingSO } from './use_onboarding_so';
import {
  buildLiveStalePolicyIds,
  buildEffectivePendingCleanup,
  buildCleanedLiveStale,
  buildRemainingPending,
} from './cleanup_reconciliation';

export interface UseAgentBasedDeployResult {
  targets: DeployGroup[];
  isDeploying: boolean;
  failedInstances: string[];
  /** True when a successful deploy result already exists in persisted state. */
  isAlreadyDeployed: boolean;
  /** Trigger a deploy (or retry). Defaults to all targets; pass specific instanceIds for retry.
   *  Returns a Promise that resolves to `{ failed: boolean }` when the deploy settles. */
  handleDeploy: (instanceIds?: string[]) => Promise<{ failed: boolean }>;
  namespace: string;
  setNamespace: (ns: string) => void;
  /** Update the in-memory credential values used on the next deploy. Secrets (secret_access_key,
   *  session_token) are kept in a ref — never written to session storage. */
  setAgentCredentials: (creds: AgentCredentialVars | undefined) => void;
}

export function useAgentBasedDeploy(): UseAgentBasedDeployResult {
  const {
    servicesStep,
    authenticateAndDeployStep,
    detectAndReviewStep,
    updateDetectAndReviewStep,
    removeDeployInstances,
    getLatestFailedInstances,
    awsServicesMap: servicesMap,
    agentBasedDeployment,
    setAgentBasedDeployment,
  } = useOnboardingFlow();
  const { updateDeployment: updateDeploymentSO } = useOnboardingSO();

  const { selectedServiceIds } = servicesStep;

  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    { globalRegion: '', serviceVars: {} }
  );

  const [namespace, setNamespace] = useState('default');
  const [isDeploying, setIsDeploying] = useState(false);
  // In-memory credential ref — secrets (secret_access_key, session_token) are never persisted.
  const agentCredentialsRef = useRef<AgentCredentialVars | undefined>(undefined);
  const setAgentCredentials = useCallback((creds: AgentCredentialVars | undefined) => {
    agentCredentialsRef.current = creds;
  }, []);
  // Deliberately NOT seeded from detectAndReviewStep.failedInstances, unlike useDeploy.
  // failedInstances is one shared session key that the managed-integration path also writes, so
  // seeding would surface a stale MI failure as an agent-based "Deployment failed" callout that
  // survives restarts. The agent path doesn't need the persisted-failure-survives-remount
  // behaviour MI relies on, because agentPolicyId is its durable success flag.
  const [failedInstances, setFailedInstances] = useState<string[]>([]);

  const targets: DeployGroup[] = useMemo(
    () =>
      buildAgentBasedTargets(
        serviceSettings?.instances ?? [],
        selectedServiceIds,
        servicesMap ?? new Map()
      ),
    [serviceSettings?.instances, selectedServiceIds, servicesMap]
  );

  // Deploy is "already done" when every target instance has a persisted package policy id AND
  // there is no pending cleanup to run.
  // This covers both paths durably:
  //   - New policy: agentPolicyId is set in session storage AND policyIdsByInstance is populated.
  //   - Existing policy: agentPolicyId is never set, but policyIdsByInstance is populated after
  //     a successful deploy — this prevents re-deploying on Back+Next in existing mode.
  // Returns false when cleanup is needed so handleNext doesn't short-circuit before calling
  // handleDeploy (which runs the cleanup even when no new targets need to be deployed).
  const isAlreadyDeployed = useMemo(() => {
    if (targets.length === 0) return false;
    const policyIdsByInstance = detectAndReviewStep.policyIdsByInstance ?? {};
    const activeInstanceIds = new Set(targets.flatMap((g) => g.instanceIds));
    // Live-stale: policyIdsByInstance has entries for services no longer in targets (e.g. user
    // deselected from Step 1). The shared package policy must be updated to drop removed inputs.
    const liveStalePolicyIds = buildLiveStalePolicyIds(policyIdsByInstance, activeInstanceIds);
    if (Object.keys(liveStalePolicyIds).length > 0) return false;
    // Explicit cleanup staged by removeDeployInstance (Step 4 deselection).
    if (Object.keys(detectAndReviewStep.pendingCleanupPolicyIds ?? {}).length > 0) return false;
    return targets.every((group) =>
      group.instanceIds.every((instanceId) => !!policyIdsByInstance[instanceId])
    );
  }, [
    targets,
    detectAndReviewStep.policyIdsByInstance,
    detectAndReviewStep.pendingCleanupPolicyIds,
  ]);

  const handleDeploy = useCallback(
    async (instanceIds?: string[]): Promise<{ failed: boolean }> => {
      const isRetry = instanceIds !== undefined && instanceIds.length > 0;
      const alreadyDeployedIds = new Set(
        Object.keys(detectAndReviewStep.policyIdsByInstance ?? {})
      );
      // For retries, keep only groups that have at least one instanceId to retry.
      // For fresh deploys, skip groups where every instance already has a package policy —
      // this handles incremental service additions (deploy A, add B, Next should only deploy B).
      const targetsToDeploy = isRetry
        ? targets.filter((g) => g.instanceIds.some((id) => instanceIds.includes(id)))
        : targets.filter((g) => g.instanceIds.some((id) => !alreadyDeployedIds.has(id)));

      // Services deselected from Step 1 never call removeDeployInstance, so pendingCleanupPolicyIds
      // won't capture them. Detect stale entries by comparing policyIdsByInstance against the
      // reconciled targets (which already filters by selectedServiceIds).
      const activeInstanceIds = new Set(targets.flatMap((g) => g.instanceIds));
      const liveStalePolicyIds = buildLiveStalePolicyIds(
        detectAndReviewStep.policyIdsByInstance ?? {},
        activeInstanceIds
      );
      const effectivePendingCleanup = buildEffectivePendingCleanup(
        liveStalePolicyIds,
        detectAndReviewStep.pendingCleanupPolicyIds
      );

      const hasPendingCleanup = Object.keys(effectivePendingCleanup).length > 0;

      if (
        targetsToDeploy.length === 0 &&
        !hasPendingCleanup &&
        !(detectAndReviewStep.isDirty ?? false)
      )
        return { failed: false };

      setIsDeploying(true);
      updateDetectAndReviewStep({ isDeploying: true });

      try {
        const { agentHostsMode, agentPolicyId, selectedAgentPolicyIds } = agentBasedDeployment;
        const globalRegion = serviceSettings?.globalRegion ?? '';
        const storedServiceVars = serviceSettings?.serviceVars ?? {};

        const baseOpts = {
          namespace,
          globalRegion,
          storedServiceVars,
          authenticateAndDeployStep,
          pkgVersion: '', // overridden per-package inside deploy functions
          agentCredentials: agentCredentialsRef.current,
        };

        // Clean up package policies for removed services before creating new ones.
        if (hasPendingCleanup) {
          const targetPolicyIds = agentPolicyId ? [agentPolicyId] : selectedAgentPolicyIds ?? [];
          const cleanupOps = await cleanupAgentBasedPolicies({
            pendingCleanupPolicyIds: effectivePendingCleanup,
            currentPolicyIdsByInstance: detectAndReviewStep.policyIdsByInstance ?? {},
            instances: serviceSettings?.instances ?? [],
            storedServiceVars,
            globalRegion,
            namespace,
            authenticateAndDeployStep,
            servicesMap: servicesMap ?? new Map(),
            selectedAgentPolicyIds: targetPolicyIds,
            agentCredentials: agentCredentialsRef.current,
          });
          // Only prune instances whose policy cleanup actually succeeded — failed cleanups
          // remain in pendingCleanupPolicyIds for retry on the next deploy attempt.
          const succeededIds = new Set([
            ...cleanupOps.toDelete,
            ...cleanupOps.toUpdate.map((u) => u.policyId),
          ]);
          // Agent-based deploy has no "update" semantics — a policy is either deleted or kept
          // entirely, so no survivingInstanceIds filter is needed here.
          const cleanedLiveStale = buildCleanedLiveStale(liveStalePolicyIds, succeededIds);
          removeDeployInstances(cleanedLiveStale);
          const remainingPending = buildRemainingPending(
            detectAndReviewStep.pendingCleanupPolicyIds,
            succeededIds
          );
          updateDetectAndReviewStep({ pendingCleanupPolicyIds: remainingPending });
        }

        // Dirty update: update already-deployed package policies with current settings.
        // Runs unconditionally when isDirty — before deploying new targets — so that existing
        // policies are always brought up to date in the same run even when the user adds a service
        // alongside the setting change.
        let dirtyUpdateApplied = false;
        if (detectAndReviewStep.isDirty ?? false) {
          const targetPolicyIds = agentPolicyId ? [agentPolicyId] : selectedAgentPolicyIds ?? [];
          const byPolicy = new Map<string, string[]>();
          for (const [instanceId, policyId] of Object.entries(
            detectAndReviewStep.policyIdsByInstance ?? {}
          )) {
            if (!byPolicy.has(policyId)) byPolicy.set(policyId, []);
            byPolicy.get(policyId)!.push(instanceId);
          }
          if (byPolicy.size > 0) {
            const redeployResults = await Promise.allSettled(
              [...byPolicy.entries()].map(([policyId, instanceIds]) =>
                updateAgentBasedPolicy(policyId, instanceIds, {
                  instances: serviceSettings?.instances ?? [],
                  storedServiceVars,
                  globalRegion,
                  namespace,
                  authenticateAndDeployStep,
                  servicesMap: servicesMap ?? new Map(),
                  selectedAgentPolicyIds: targetPolicyIds,
                  agentCredentials: agentCredentialsRef.current,
                })
              )
            );
            redeployResults.forEach((result) => {
              if (result.status === 'rejected') {
                // eslint-disable-next-line no-console
                console.error('Failed to update agent-based policy during dirty redeploy:', result.reason);
              }
            });
            if (redeployResults.some((r) => r.status === 'rejected')) {
              setIsDeploying(false);
              updateDetectAndReviewStep({ isDeploying: false });
              return { failed: true };
            }
          }

          // Pure dirty-redeploy case: no new targets and no cleanup remaining.
          if (targetsToDeploy.length === 0 && !hasPendingCleanup) {
            const { onboardingDeploymentId } = detectAndReviewStep;
            if (onboardingDeploymentId) {
              const soUpdated = await updateDeploymentSO(onboardingDeploymentId, {
                services: selectedServiceIds,
                serviceVars: toSOServiceVars(storedServiceVars, servicesMap ?? new Map()) as Record<
                  string,
                  Record<string, unknown>
                >,
                authMethod: authenticateAndDeployStep.authMethod ?? null,
                connectorId: authenticateAndDeployStep.connectorId ?? null,
              });
              if (!soUpdated) {
                // Toast already shown by updateDeploymentSO. Keep isDirty so the user can retry.
                setIsDeploying(false);
                updateDetectAndReviewStep({ isDeploying: false });
                return { failed: true };
              }
            }
            setIsDeploying(false);
            updateDetectAndReviewStep({ isDeploying: false, isDirty: false });
            return { failed: false };
          }
          dirtyUpdateApplied = true;
          // Falls through to the new-target deploy path below; isDirty cleared after that succeeds.
        }

        if (targetsToDeploy.length === 0) {
          setIsDeploying(false);
          updateDetectAndReviewStep({ isDeploying: false });
          // Cleanup is best-effort — any entries that couldn't be cleared remain staged for
          // the next deploy attempt. Don't block navigation on a cleanup-only run.
          return { failed: false };
        }

        let policyIdsByInstance: Record<string, string> = {};
        let failed: string[] = [];
        let errorsByInstance: Record<string, string> = {};

        // Route to the existing-policy path when:
        // - agentHostsMode === 'existing': user selected an existing policy.
        // - agentPolicyId is already set: the flyout created the policy on a previous attempt
        //   (including the very first Next click when the flyout ran), so we target the existing
        //   policy to avoid creating a second one (double-creation guard applies on retry too).
        if (agentHostsMode === 'existing' || agentPolicyId) {
          const targetPolicyIds = agentPolicyId ? [agentPolicyId] : selectedAgentPolicyIds ?? [];

          const result = await deployToExistingAgentPolicies(targetsToDeploy, {
            ...baseOpts,
            selectedAgentPolicyIds: targetPolicyIds,
          });
          policyIdsByInstance = result.packagePolicyIdsByInstance;
          failed = result.failedInstances;
          errorsByInstance = result.errorsByInstance;
        } else {
          // New Agent Policy path — one-shot transactional call.
          try {
            const agentPolicyName =
              agentBasedDeployment.agentPolicyName || (await buildAgentPolicyName());
            const result = await deployNewAgentPolicy(targetsToDeploy, {
              ...baseOpts,
              agentPolicyName,
              withSysMonitoring: agentBasedDeployment.withSysMonitoring ?? true,
            });
            policyIdsByInstance = result.packagePolicyIdsByInstance;
            // Persist the agent policy id so retries and step 4 can find it.
            setAgentBasedDeployment({
              agentPolicyId: result.agentPolicyId,
              agentPolicyName: result.agentPolicyName,
            });
          } catch (err) {
            // The server-side handler rolls back on failure — all instances fail together.
            // extractErrorMessage, not String(err): Fleet rejects with an IHttpFetchError whose
            // server detail is in body.message, so String() would render "[object Object]".
            const msg = extractErrorMessage(err);
            failed = targetsToDeploy.flatMap((g) => g.instanceIds);
            errorsByInstance = Object.fromEntries(failed.map((id) => [id, msg]));
          }
        }

        const allTargetIds = targetsToDeploy.flatMap((g) => g.instanceIds);
        const statuses = buildAgentBasedInstanceStatuses(targetsToDeploy, failed);

        setFailedInstances(failed);
        updateDetectAndReviewStep({
          isDeploying: false,
          serviceStatuses: statuses,
          policyIdsByInstance,
          // On retry, merge with latest to preserve statuses for non-retried instances.
          failedInstances: isRetry
            ? [...getLatestFailedInstances().filter((id) => !allTargetIds.includes(id)), ...failed]
            : failed,
          deployErrors: errorsByInstance,
          // Clear drift flag when new targets were deployed alongside a successful dirty update.
          ...(dirtyUpdateApplied && failed.length === 0 ? { isDirty: false } : {}),
        });
        return { failed: failed.length > 0 };
      } catch (err) {
        // Unexpected error — mark all as failed.
        const msg = extractErrorMessage(err);
        const allIds = targetsToDeploy.flatMap((g) => g.instanceIds);
        const statuses = buildAgentBasedInstanceStatuses(targetsToDeploy, allIds);
        setFailedInstances(allIds);
        updateDetectAndReviewStep({
          isDeploying: false,
          serviceStatuses: statuses,
          failedInstances: allIds,
          deployErrors: Object.fromEntries(allIds.map((id) => [id, msg])),
        });
        return { failed: true };
      } finally {
        setIsDeploying(false);
      }
    },
    [
      targets,
      namespace,
      serviceSettings,
      selectedServiceIds,
      authenticateAndDeployStep,
      agentBasedDeployment,
      setAgentBasedDeployment,
      detectAndReviewStep,
      updateDetectAndReviewStep,
      removeDeployInstances,
      getLatestFailedInstances,
      servicesMap,
      updateDeploymentSO,
    ]
  );

  return {
    targets,
    isDeploying,
    failedInstances,
    isAlreadyDeployed,
    handleDeploy,
    namespace,
    setNamespace,
    setAgentCredentials,
  };
}
