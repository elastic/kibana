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
import {
  cleanupManagedIntegrationsPolicies,
  updateManagedIntegrationsPolicy,
} from './policy_cleanup_managed_integrations';
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
  isDirty: boolean;
  /** True when auth method or connector specifically changed. Only pass overrideCloudConnector when true. */
  isAuthDirty: boolean;
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
  // Only include members that are not already deployed — avoids creating duplicate policies when
  // existing instance IDs appear in failedInstances (e.g. after a dirty-update failure where the
  // underlying Fleet policies were already deployed and only the settings update failed).
  const groupsToDeploy = deployGroups
    .map((group) => {
      const retryMembers = group.members.filter(
        ({ instance }) =>
          retrySet.has(instance.instanceId) && !(instance.instanceId in policyIdsByInstance)
      );
      if (retryMembers.length === 0) return null;
      return {
        ...group,
        instanceIds: retryMembers.map(({ instance }) => instance.instanceId),
        members: retryMembers,
      };
    })
    .filter((g): g is DeployGroup => g !== null);
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
  isDirty,
  isAuthDirty,
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
      // undefined when cleanup didn't run; retry path writes mid-flight, initial path in final update.
      let remainingPending: Record<string, string> | undefined;
      let dirtyUpdateApplied = false;

      // Updates all already-deployed MI policies with the current session config.
      // Returns whether any policy update failed and the full set of IDs to mark failed.
      // additionalFailedIds: undeployed targets that should also surface as failed on error
      // (plan.targets on initial run; plan.groupsToDeploy instanceIds on retry).
      async function applyDirtyPolicyUpdates(
        additionalFailedIds: string[]
      ): Promise<{ hadFailures: boolean; allFailedIds: string[] }> {
        const byPolicy = new Map<string, string[]>();
        // Only include active instances (still in deployGroups). Removed instances whose
        // policyIds linger in the SO are cleanup targets, not update targets; including them
        // would cause resolveSurvivingMembers to reject on pruned synthetic instance IDs.
        const activeInstanceIds = new Set(deployGroups.flatMap((g) => g.instanceIds));
        for (const [instanceId, policyId] of Object.entries(policyIdsByInstance)) {
          if (!activeInstanceIds.has(instanceId)) continue;
          if (!byPolicy.has(policyId)) byPolicy.set(policyId, []);
          byPolicy.get(policyId)!.push(instanceId);
        }
        if (byPolicy.size === 0) {
          // Distinguish two empty-byPolicy cases:
          // (a) All policyIdsByInstance entries are deselected (cleanup targets) — not a failure.
          //     activeInstanceIds has the new selection, so it's non-empty.
          // (b) Resume via ?deploymentId skipped Step 2 — deployGroups is empty, so
          //     activeInstanceIds is empty too. Fail closed to prevent clearing isDirty without
          //     a Fleet PUT.
          return activeInstanceIds.size === 0 && Object.keys(policyIdsByInstance).length > 0
            ? { hadFailures: true, allFailedIds: Object.keys(policyIdsByInstance) }
            : { hadFailures: false, allFailedIds: [] };
        }
        const results = await Promise.allSettled(
          [...byPolicy.entries()].map(([policyId, instanceIdsForPolicy]) =>
            updateManagedIntegrationsPolicy(policyId, instanceIdsForPolicy, {
              instances: serviceSettings?.instances ?? [],
              storedServiceVars: serviceSettings?.serviceVars ?? {},
              globalRegion: serviceSettings?.globalRegion ?? '',
              namespace,
              authenticateAndDeployStep,
              servicesMap: servicesMap ?? new Map(),
              // Override the connector when auth changed or when deploying with static keys.
              // Static keys never use a cloud connector; any connector attached externally after
              // the original deploy must be cleared on redeploy so credentials take effect.
              // Without the static_keys guard, a key-replacement that doesn't set isAuthDirty
              // (same authMethod/connectorId in the SO comparison) would silently preserve a
              // connector that was attached by an operator after the initial deploy.
              ...(isAuthDirty || authenticateAndDeployStep.authMethod === 'static_keys'
                ? { overrideCloudConnector: authenticateAndDeployStep.connectorId ?? null }
                : {}),
            })
          )
        );
        results.forEach((result) => {
          if (result.status === 'rejected') {
            // eslint-disable-next-line no-console
            console.error(
              'Failed to update managed-integration policy during dirty redeploy:',
              result.reason
            );
          }
        });
        const hadFailures = results.some((r) => r.status === 'rejected');
        return {
          hadFailures,
          allFailedIds: hadFailures
            ? [
                // Active instances only: deselected instances are cleanup targets and must not
                // re-enter failedInstances once cleanup removes them from policyIdsByInstance.
                ...Object.keys(policyIdsByInstance).filter((id) => activeInstanceIds.has(id)),
                ...additionalFailedIds,
              ]
            : [],
        };
      }

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
          !plan.hasPendingCleanup &&
          !isDirty
        ) {
          onContinue();
          // Everything is already deployed: the only work left is a template-details write that
          // failed last time.
          await persistPendingIacTemplate();
          return { cleanupFailed: false };
        }

        // Dirty update: update all already-deployed MI policies with the current session config.
        // Runs when isDirty regardless of whether there are new targets, so existing policies
        // are always brought up to date in the same run even when the user adds a service.
        if (isDirty) {
          // Lock the Deploy button before awaiting any Fleet calls so a double-click cannot
          // start a second dirty-update run from the same undeployed-target snapshot.
          setIsDeploying(true);
          updateDetectAndReviewStep({ isDeploying: true });
          // Include plan.targets so undeployed new services are also queued for retry — without
          // this they are dropped from failedInstances and planMiRetryRun never deploys them.
          const { hadFailures, allFailedIds } = await applyDirtyPolicyUpdates(plan.targets);
          if (hadFailures) {
            // At least one policy update failed — surface the existing instances as failed so
            // hasFailed becomes true and the Retry button appears. Leave isDirty so Deploy stays
            // visible for retry. Return cleanupFailed: true so the ECF-only gate blocks navigation.
            setIsDeploying(false);
            setFailedInstances(allFailedIds);
            updateDetectAndReviewStep({
              isDeploying: false,
              failedInstances: allFailedIds,
            });
            return { cleanupFailed: true };
          }

          // Pure dirty-redeploy case: no new targets and no cleanup remaining.
          if (plan.targets.length === 0 && !plan.hasPendingCleanup) {
            if (onboardingDeploymentId) {
              const soUpdated = await updateDeployment(onboardingDeploymentId, {
                services: selectedServiceIds,
                serviceVars: toSOServiceVars(
                  serviceSettings?.serviceVars ?? {},
                  servicesMap ?? new Map()
                ) as Record<string, Record<string, unknown>>,
                authMethod: authenticateAndDeployStep.authMethod ?? null,
                connectorId: authenticateAndDeployStep.connectorId ?? null,
              });
              if (!soUpdated) {
                // Toast already shown by updateDeployment. Keep isDirty so the user can retry.
                // Return cleanupFailed: true so the ECF-only gate in handleNext blocks navigation.
                setIsDeploying(false);
                updateDetectAndReviewStep({ isDeploying: false });
                return { cleanupFailed: true };
              }
            }
            setIsDeploying(false);
            updateDetectAndReviewStep({ isDeploying: false, isDirty: false, isAuthDirty: false });
            await persistPendingIacTemplate();
            return { cleanupFailed: false };
          }
          dirtyUpdateApplied = true;
          // Falls through to the new-target deploy path below; isDirty cleared after that succeeds.
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
            (cleanupOps.toDelete.length > 0 || cleanupOps.toUpdate.length > 0 || dirtyUpdateApplied)
          ) {
            const deletedIds = new Set(cleanupOps.toDelete);
            const survivingEntries = Object.entries(policyIdsByInstance).filter(
              ([iid, pid]) => !cleanedInstanceIds.has(iid) && !deletedIds.has(pid)
            );
            soWriteSucceeded = await updateDeployment(onboardingDeploymentId, {
              services: selectedServiceIds,
              packagePolicyIds: [...new Set(survivingEntries.map(([, pid]) => pid))],
              policyIdsByInstance: Object.fromEntries(survivingEntries),
              // When dirty update ran before cleanup, persist the new auth/serviceVars in the same
              // write so the SO stays consistent even if a second write never happens.
              ...(dirtyUpdateApplied
                ? {
                    serviceVars: toSOServiceVars(
                      serviceSettings?.serviceVars ?? {},
                      servicesMap ?? new Map()
                    ) as Record<string, Record<string, unknown>>,
                    authMethod: authenticateAndDeployStep.authMethod ?? null,
                    connectorId: authenticateAndDeployStep.connectorId ?? null,
                  }
                : {}),
            });
          }
          setIsDeploying(false);
          updateDetectAndReviewStep({
            isDeploying: false,
            ...(soWriteSucceeded ? { pendingCleanupPolicyIds: {} } : {}),
            ...(dirtyUpdateApplied && soWriteSucceeded
              ? { isDirty: false, isAuthDirty: false }
              : {}),
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

        // Hoist cleanup result so it can be merged into a single updateDetectAndReviewStep call.
        // React may batch synchronous state updates, meaning two sequential calls in the same
        // tick both capture the same prev state — the second call would clobber the
        // pendingCleanupPolicyIds written by the first.
        let retryRemainingPending: Record<string, string> | undefined;
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
          retryRemainingPending = retryReconciliation.remainingPending;
        }

        // Dirty-update failures (instance in policyIdsByInstance) whose settings have since been
        // restored to match the SO (isDirty=false) are resolved: the unchanged policy is already
        // correct and no PUT is needed. Retain only failures that still require action.
        const cleanedByDriftRestore = isDirty
          ? []
          : instanceIds.filter((id) => id in (policyIdsByInstance ?? {}));
        const effectiveRemainingFailed = plan.remainingFailed.filter(
          (id) => !cleanedByDriftRestore.includes(id)
        );

        // Combine cleanup result with service-status update into one write so React batching
        // cannot lose pendingCleanupPolicyIds.
        updateDetectAndReviewStep({
          ...(retryRemainingPending !== undefined
            ? { pendingCleanupPolicyIds: retryRemainingPending }
            : {}),
          serviceStatuses: buildInstanceStatuses(plan.deployedTargets, []),
          failedInstances: effectiveRemainingFailed,
          deployErrors: {},
        });

        // Dirty update on retry: bring all already-deployed policies up to date before
        // re-deploying the failed ones, so a connector/serviceVar change is applied even if the
        // user only clicks Retry (not a fresh Deploy).
        if (isDirty) {
          // Include undeployed retry targets so they remain queued for the next retry run.
          const retryDeployTargets = plan.groupsToDeploy.flatMap((g) => g.instanceIds);
          const { hadFailures, allFailedIds } = await applyDirtyPolicyUpdates(retryDeployTargets);
          if (hadFailures) {
            setIsDeploying(false);
            setFailedInstances(allFailedIds);
            updateDetectAndReviewStep({
              isDeploying: false,
              failedInstances: allFailedIds,
              // Re-include cleanup result in case this write races with the combined write above;
              // also prevents a batched call from losing the pendingCleanupPolicyIds update.
              ...(retryRemainingPending !== undefined
                ? { pendingCleanupPolicyIds: retryRemainingPending }
                : {}),
            });
            return { cleanupFailed: true };
          }
          dirtyUpdateApplied = true;
        }
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
      // When a dirty update was applied, exclude instances that were already deployed (in
      // policyIdsByInstance) — they appear in failedInstances due to a dirty-update failure, but
      // the settings update has now succeeded so they are no longer failed.
      const deployedSet = new Set(deployedTargets);
      const previouslyFailed = getLatestFailedInstances().filter(
        (id) => !deployedSet.has(id) && !(dirtyUpdateApplied && id in policyIdsByInstance)
      );
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
          // Persist updated auth fields when a dirty update ran — authMethod/connectorId are not
          // included in the initial createDeployment call body for existing-credential edits, so
          // the SO would otherwise retain the old values after a combined dirty+new-target deploy.
          ...(dirtyUpdateApplied
            ? {
                authMethod: authenticateAndDeployStep.authMethod ?? null,
                connectorId: authenticateAndDeployStep.connectorId ?? null,
              }
            : {}),
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
        // Clear drift flag only when the SO write confirmed the new state — if the SO PUT failed
        // the drift settings were not persisted, so isDirty must remain true to force a retry.
        ...(dirtyUpdateApplied && mergedFailed.length === 0 && soWriteSucceeded
          ? { isDirty: false, isAuthDirty: false }
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
      isDirty,
      isAuthDirty,
    ]
  );
}
