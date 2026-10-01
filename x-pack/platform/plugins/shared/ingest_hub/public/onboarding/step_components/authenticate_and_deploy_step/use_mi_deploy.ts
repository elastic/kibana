/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import type { AwsServiceMatrixEntry, DataFormat } from '../../aws_service_matrix';
import type {
  AuthenticateAndDeployStepState,
  DetectAndReviewStepState,
  ServiceChipState,
} from '../../onboarding_flow_context';
import type { ServiceSettingsPersistedState } from '../service_settings_step/use_service_settings';
import { buildInstanceStatuses, collectDeployResults, deployGroup } from './deploy_groups';
import type { DeployGroup } from './deploy_groups';
import { toSOServiceVars } from './package_inputs';
import type { UseOnboardingSOResult } from './use_onboarding_so';
import { cleanupManagedIntegrationsPolicies } from './policy_cleanup_managed_integrations';
import type { PolicyCleanupOps } from './policy_cleanup';
import {
  buildLiveStalePolicyIds,
  buildEffectivePendingCleanup,
  buildCleanedLiveStale,
  buildRemainingPending,
} from './cleanup_reconciliation';

export interface UseMiDeployParams {
  deployGroups: DeployGroup[];
  nonAgentlessServices: AwsServiceMatrixEntry[];
  serviceSettings: ServiceSettingsPersistedState | null | undefined;
  authenticateAndDeployStep: AuthenticateAndDeployStepState;
  namespace: string;
  selectedServiceIds: string[];
  dataFormat: DataFormat;
  servicesMap: Map<string, AwsServiceMatrixEntry> | undefined;
  hasEcfServices: boolean;
  onContinue: () => void;
  updateDetectAndReviewStep: (update: Partial<DetectAndReviewStepState>) => void;
  removeDeployInstances: (instanceIds: string[]) => void;
  getLatestFailedInstances: () => string[];
  persistPendingIacTemplate: () => Promise<void>;
  setIsDeploying: (deploying: boolean) => void;
  setFailedInstances: (instances: string[]) => void;
  createDeployment: UseOnboardingSOResult['createDeployment'];
  updateDeployment: UseOnboardingSOResult['updateDeployment'];
  persistDeploymentId: UseOnboardingSOResult['persistDeploymentId'];
  serviceStatuses: Record<string, ServiceChipState>;
  failedInstances: string[];
  onboardingDeploymentId: string | undefined;
  policyIdsByInstance: Record<string, string>;
  pendingCleanupPolicyIds: Record<string, string> | undefined;
}

// ── Module-level planning helpers ────────────────────────────────────────────
// Pure functions that compute what to deploy/clean up. Extracted so they can be
// tested independently of the React hook and its async cleanup/deploy logic.

interface MiInitialRunPlan {
  groupsToDeploy: DeployGroup[];
  targets: string[];
  newNonAgentlessStatuses: Record<string, ServiceChipState>;
  liveStalePolicyIds: Record<string, string>;
  effectivePendingCleanup: Record<string, string>;
  hasPendingCleanup: boolean;
}

export function planMiInitialRun(
  deployGroups: DeployGroup[],
  serviceStatuses: Record<string, ServiceChipState>,
  policyIdsByInstance: Record<string, string>,
  pendingCleanupPolicyIds: Record<string, string> | undefined,
  nonAgentlessServices: AwsServiceMatrixEntry[]
): MiInitialRunPlan {
  // Only deploy instances not already tracked — prevents re-deploying on Back+Next or after resume.
  const groupsToDeploy = deployGroups
    .map((group) => {
      const untrackedMembers = group.members.filter(
        ({ instance }) =>
          !(instance.instanceId in serviceStatuses) && !(instance.instanceId in policyIdsByInstance)
      );
      if (untrackedMembers.length === 0) return null;
      return {
        ...group,
        instanceIds: untrackedMembers.map(({ instance }) => instance.instanceId),
        members: untrackedMembers,
      };
    })
    .filter((g): g is DeployGroup => g !== null);

  const targets = groupsToDeploy.flatMap(({ instanceIds: ids }) => ids);

  // Non-MI services (ECF) get a gray 'instantiating' chip if not yet tracked.
  const newNonAgentlessStatuses: Record<string, ServiceChipState> = {};
  for (const service of nonAgentlessServices) {
    if (!(service.id in serviceStatuses)) {
      newNonAgentlessStatuses[service.id] = 'instantiating';
    }
  }

  // Step-1 deselections do not go through removeDeployInstance, so detect them via
  // the reconciled deployGroups (which already filters by selectedServiceIds).
  const activeInstanceIds = new Set(deployGroups.flatMap((g) => g.instanceIds));
  const liveStalePolicyIds = buildLiveStalePolicyIds(policyIdsByInstance, activeInstanceIds);
  const effectivePendingCleanup = buildEffectivePendingCleanup(
    liveStalePolicyIds,
    pendingCleanupPolicyIds
  );
  const hasPendingCleanup = Object.keys(effectivePendingCleanup).length > 0;

  return {
    groupsToDeploy,
    targets,
    newNonAgentlessStatuses,
    liveStalePolicyIds,
    effectivePendingCleanup,
    hasPendingCleanup,
  };
}

interface MiRetryPlan {
  groupsToDeploy: DeployGroup[];
  deployedTargets: string[];
  remainingFailed: string[];
  retryLiveStale: Record<string, string>;
  retryPending: Record<string, string>;
}

export function planMiRetryRun(
  instanceIds: string[],
  deployGroups: DeployGroup[],
  policyIdsByInstance: Record<string, string>,
  pendingCleanupPolicyIds: Record<string, string> | undefined,
  failedInstances: string[]
): MiRetryPlan {
  const retrySet = new Set(instanceIds);
  const groupsToDeploy = deployGroups.filter(({ instanceIds: ids }) =>
    ids.some((id) => retrySet.has(id))
  );
  // May be wider than retrySet when a bundled group is included.
  const deployedTargets = groupsToDeploy.flatMap(({ instanceIds: ids }) => ids);
  const remainingFailed = failedInstances.filter((id) => !deployedTargets.includes(id));

  const retryActiveIds = new Set(deployGroups.flatMap((g) => g.instanceIds));
  const retryLiveStale = buildLiveStalePolicyIds(policyIdsByInstance, retryActiveIds);
  const retryPending = buildEffectivePendingCleanup(retryLiveStale, pendingCleanupPolicyIds);

  return { groupsToDeploy, deployedTargets, remainingFailed, retryLiveStale, retryPending };
}

interface MiCleanupReconciliation {
  cleanedInstanceIds: Set<string>;
  remainingPending: Record<string, string>;
  cleanupFailed: boolean;
}

/**
 * After cleanupManagedIntegrationsPolicies resolves, computes which live-stale
 * instances were cleaned and what pending entries remain for retry. Also calls
 * removeDeployInstances so the session state is updated in the same write.
 */
export function reconcileMiCleanupOps(
  cleanupOps: PolicyCleanupOps,
  liveStalePolicyIds: Record<string, string>,
  pendingCleanupPolicyIds: Record<string, string> | undefined,
  removeDeployInstances: (ids: string[]) => void
): MiCleanupReconciliation {
  const succeededIds = new Set([
    ...cleanupOps.toDelete,
    ...cleanupOps.toUpdate.map((u) => u.policyId),
  ]);
  // Surviving instances from toUpdate still have an active policy — they must not be pruned.
  const survivingFromUpdate = new Set(cleanupOps.toUpdate.flatMap((u) => u.survivingInstanceIds));
  const cleanedLiveStale = buildCleanedLiveStale(
    liveStalePolicyIds,
    succeededIds,
    survivingFromUpdate
  );
  // removeDeployInstances must come before clearing pendingCleanupPolicyIds so its
  // full-replacement write isn't overwritten by a subsequent updateDetectAndReviewStep.
  removeDeployInstances(cleanedLiveStale);
  const remainingPending = buildRemainingPending(pendingCleanupPolicyIds, succeededIds);
  const cleanupFailed = Object.keys(remainingPending).length > 0;
  return {
    cleanedInstanceIds: new Set(cleanedLiveStale),
    remainingPending,
    cleanupFailed,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMiDeploy({
  deployGroups,
  nonAgentlessServices,
  serviceSettings,
  authenticateAndDeployStep,
  namespace,
  selectedServiceIds,
  dataFormat,
  servicesMap,
  hasEcfServices,
  onContinue,
  updateDetectAndReviewStep,
  removeDeployInstances,
  getLatestFailedInstances,
  persistPendingIacTemplate,
  setIsDeploying,
  setFailedInstances,
  createDeployment,
  updateDeployment,
  persistDeploymentId,
  serviceStatuses,
  failedInstances,
  onboardingDeploymentId,
  policyIdsByInstance,
  pendingCleanupPolicyIds,
}: UseMiDeployParams): (instanceIds?: string[]) => Promise<{ cleanupFailed: boolean }> {
  return useCallback(
    async (instanceIds?: string[]) => {
      const isInitialDeploy = instanceIds === undefined;

      let groupsToDeploy: DeployGroup[];
      let cleanupOps: PolicyCleanupOps = { toDelete: [], toUpdate: [] };
      // Instance IDs whose cleanup succeeded this run. Used to drop stale entries from the
      // persisted policyIdsByInstance — filtering by deleted policyId alone misses toUpdate cases
      // where the policy survives with fewer inputs but the removed instance should not reappear.
      let cleanedInstanceIds = new Set<string>();
      // Set when cleanup runs on the initial deploy path (targets.length > 0 branch). Written to
      // state in the final shared update so succeeded entries are cleared after the deploy SO write.
      // undefined means cleanup didn't run this invocation; the retry path writes mid-flight instead.
      let remainingPending: Record<string, string> | undefined;

      if (isInitialDeploy) {
        const plan = planMiInitialRun(
          deployGroups,
          serviceStatuses,
          policyIdsByInstance,
          pendingCleanupPolicyIds,
          nonAgentlessServices
        );
        groupsToDeploy = plan.groupsToDeploy;

        if (
          plan.targets.length === 0 &&
          Object.keys(plan.newNonAgentlessStatuses).length === 0 &&
          !plan.hasPendingCleanup
        ) {
          onContinue();
          // Everything is already deployed: the only work left is a template-details write that
          // failed last time.
          await persistPendingIacTemplate();
          return { cleanupFailed: false };
        }

        const initialStatuses = buildInstanceStatuses(plan.targets, []);
        if (plan.hasPendingCleanup || plan.targets.length > 0) setIsDeploying(true);
        updateDetectAndReviewStep({
          isDeploying: plan.hasPendingCleanup || plan.targets.length > 0,
          serviceStatuses: { ...initialStatuses, ...plan.newNonAgentlessStatuses },
        });
        onContinue();

        let cleanupFailed = false;
        if (plan.hasPendingCleanup) {
          cleanupOps = await cleanupManagedIntegrationsPolicies({
            pendingCleanupPolicyIds: plan.effectivePendingCleanup,
            currentPolicyIdsByInstance: policyIdsByInstance,
            instances: serviceSettings?.instances ?? [],
            storedServiceVars: serviceSettings?.serviceVars ?? {},
            globalRegion: serviceSettings?.globalRegion ?? '',
            namespace,
            authenticateAndDeployStep,
            servicesMap: servicesMap ?? new Map(),
          });
          ({ cleanedInstanceIds, remainingPending, cleanupFailed } = reconcileMiCleanupOps(
            cleanupOps,
            plan.liveStalePolicyIds,
            pendingCleanupPolicyIds,
            removeDeployInstances
          ));
        }

        if (plan.targets.length === 0) {
          if (cleanupFailed) {
            setIsDeploying(false);
            // Cleanup did not fully succeed — keep the section actionable so the user can retry.
            updateDetectAndReviewStep({ isDeploying: false });
            return { cleanupFailed: true };
          }
          // Cleanup-only success: prune deleted policies from the SO record, then clear local
          // pendingCleanupPolicyIds only after the SO write is confirmed. A transient SO failure
          // leaves the pending map populated so the next Deploy attempt retries the SO update
          // rather than silently losing the cleanup state.
          // setIsDeploying stays true until the SO write settles so isMiDone does not flip true
          // while the PUT is in flight, which would enable Next before the write is confirmed.
          let soWriteSucceeded = true;
          if (
            onboardingDeploymentId &&
            (cleanupOps.toDelete.length > 0 || cleanupOps.toUpdate.length > 0)
          ) {
            const deletedIds = new Set(cleanupOps.toDelete);
            const survivingEntries = Object.entries(policyIdsByInstance).filter(
              ([iid, pid]) => !cleanedInstanceIds.has(iid) && !deletedIds.has(pid)
            );
            soWriteSucceeded = await updateDeployment(onboardingDeploymentId, {
              services: selectedServiceIds,
              packagePolicyIds: [...new Set(survivingEntries.map(([, pid]) => pid))],
              policyIdsByInstance: Object.fromEntries(survivingEntries),
            });
          }
          setIsDeploying(false);
          updateDetectAndReviewStep({
            isDeploying: false,
            ...(soWriteSucceeded ? { pendingCleanupPolicyIds: {} } : {}),
          });
          await persistPendingIacTemplate();
          return { cleanupFailed: false };
        }
      } else {
        const plan = planMiRetryRun(
          instanceIds,
          deployGroups,
          policyIdsByInstance,
          pendingCleanupPolicyIds,
          failedInstances
        );
        groupsToDeploy = plan.groupsToDeploy;

        // Mark as deploying before awaiting cleanup so a double-click cannot start a second run.
        setIsDeploying(true);
        updateDetectAndReviewStep({ isDeploying: true });

        if (Object.keys(plan.retryPending).length > 0) {
          cleanupOps = await cleanupManagedIntegrationsPolicies({
            pendingCleanupPolicyIds: plan.retryPending,
            currentPolicyIdsByInstance: policyIdsByInstance,
            instances: serviceSettings?.instances ?? [],
            storedServiceVars: serviceSettings?.serviceVars ?? {},
            globalRegion: serviceSettings?.globalRegion ?? '',
            namespace,
            authenticateAndDeployStep,
            servicesMap: servicesMap ?? new Map(),
          });
          const retryReconciliation = reconcileMiCleanupOps(
            cleanupOps,
            plan.retryLiveStale,
            pendingCleanupPolicyIds,
            removeDeployInstances
          );
          cleanedInstanceIds = retryReconciliation.cleanedInstanceIds;
          updateDetectAndReviewStep({
            pendingCleanupPolicyIds: retryReconciliation.remainingPending,
          });
        }

        updateDetectAndReviewStep({
          serviceStatuses: buildInstanceStatuses(plan.deployedTargets, []),
          failedInstances: plan.remainingFailed,
          deployErrors: {},
        });
      }

      const globalRegion = serviceSettings?.globalRegion ?? '';
      const storedServiceVars = serviceSettings?.serviceVars ?? {};

      const { connectorId } = authenticateAndDeployStep;
      let currentOnboardingDeploymentId = onboardingDeploymentId;

      if (isInitialDeploy && !currentOnboardingDeploymentId) {
        currentOnboardingDeploymentId =
          (await createDeployment({
            provider: 'aws',
            connectorId,
            mechanisms: hasEcfServices ? ['managed_integration', 'ecf'] : ['managed_integration'],
            services: selectedServiceIds,
            serviceVars: toSOServiceVars(storedServiceVars, servicesMap ?? new Map()) as Record<
              string,
              Record<string, unknown>
            >,
            globalRegion,
            dataFormat,
            authMethod: connectorId ? 'identity_federation' : 'static_keys',
          })) ?? undefined;
        if (currentOnboardingDeploymentId) {
          // Enter edit mode: add ?deploymentId= to URL so the format selector is locked
          // and any reload identifies this as a resumable deployment.
          persistDeploymentId(currentOnboardingDeploymentId);
        }
      }

      // Promise.allSettled preserves insertion order, so results[i] matches groupsToDeploy[i].
      const results = await Promise.allSettled(
        groupsToDeploy.map((group) =>
          deployGroup(group, {
            namespace,
            globalRegion,
            storedServiceVars,
            authenticateAndDeployStep,
          })
        )
      );

      const deployedTargets = groupsToDeploy.flatMap(({ instanceIds: ids }) => ids);
      const {
        policyIdsByInstance: newPolicyIdsByInstance,
        failedInstances: newFailed,
        errorsByInstance,
      } = collectDeployResults(results, groupsToDeploy);
      const newServiceStatuses = buildInstanceStatuses(deployedTargets, newFailed, 'detecting');

      // Merge with instances that failed in a prior run but weren't retried in this one.
      const deployedSet = new Set(deployedTargets);
      const previouslyFailed = getLatestFailedInstances().filter((id) => !deployedSet.has(id));
      const mergedFailed = [...previouslyFailed, ...newFailed];

      // Update SO with deploy outcome (best-effort).
      // Only exclude deleted policy IDs; updated policies keep the same ID and remain active.
      const deletedPolicyIds = new Set(cleanupOps.toDelete);
      let soWriteSucceeded = true;
      if (currentOnboardingDeploymentId) {
        const mergedPolicyIdsByInstance = Object.fromEntries(
          Object.entries({
            ...policyIdsByInstance,
            ...newPolicyIdsByInstance,
          }).filter(([iid, pid]) => !cleanedInstanceIds.has(iid) && !deletedPolicyIds.has(pid))
        );
        soWriteSucceeded = await updateDeployment(currentOnboardingDeploymentId, {
          services: selectedServiceIds,
          serviceVars: toSOServiceVars(
            serviceSettings?.serviceVars ?? {},
            servicesMap ?? new Map()
          ) as Record<string, Record<string, unknown>>,
          packagePolicyIds: [...new Set(Object.values(mergedPolicyIdsByInstance))],
          policyIdsByInstance: mergedPolicyIdsByInstance,
          status: mergedFailed.length === 0 ? 'succeeded' : 'failed',
        });
      }

      if (mergedFailed.length === 0) {
        await persistPendingIacTemplate();
      }

      setIsDeploying(false);
      setFailedInstances(mergedFailed);
      updateDetectAndReviewStep({
        isDeploying: false,
        serviceStatuses: newServiceStatuses,
        policyIdsByInstance: newPolicyIdsByInstance,
        failedInstances: mergedFailed,
        deployErrors: errorsByInstance,
        // Only clear succeeded cleanup entries if the SO write confirmed them — a transient SO
        // failure must keep pendingCleanupPolicyIds populated for retry, matching the cleanup-only
        // path. undefined leaves the retry path's mid-flight update intact.
        ...(remainingPending !== undefined && soWriteSucceeded
          ? { pendingCleanupPolicyIds: remainingPending }
          : {}),
      });
      return { cleanupFailed: false };
    },
    [
      deployGroups,
      nonAgentlessServices,
      serviceSettings,
      authenticateAndDeployStep,
      namespace,
      selectedServiceIds,
      dataFormat,
      servicesMap,
      hasEcfServices,
      onContinue,
      updateDetectAndReviewStep,
      removeDeployInstances,
      getLatestFailedInstances,
      persistPendingIacTemplate,
      setIsDeploying,
      setFailedInstances,
      createDeployment,
      updateDeployment,
      persistDeploymentId,
      serviceStatuses,
      failedInstances,
      onboardingDeploymentId,
      policyIdsByInstance,
      pendingCleanupPolicyIds,
    ]
  );
}
