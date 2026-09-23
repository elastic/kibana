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
}: UseMiDeployParams): (instanceIds?: string[]) => Promise<void> {
  return useCallback(
    async (instanceIds?: string[]) => {
      const isInitialDeploy = instanceIds === undefined;

      let groupsToDeploy: DeployGroup[];
      let cleanupOps: PolicyCleanupOps = { toDelete: [], toUpdate: [] };

      if (isInitialDeploy) {
        // Restrict each group to members not already tracked — an already-deployed instance
        // must not get a second policy on a subsequent Deploy click (e.g. after navigating back).
        groupsToDeploy = deployGroups
          .map((group) => {
            const untrackedMembers = group.members.filter(
              ({ instance }) => !(instance.instanceId in serviceStatuses)
            );
            if (untrackedMembers.length === 0) return null;
            return {
              ...group,
              instanceIds: untrackedMembers.map(({ instance }) => instance.instanceId),
              members: untrackedMembers,
            };
          })
          .filter((g): g is DeployGroup => g !== null);
        // Flat list of all instanceIds being deployed this run.
        const targets = groupsToDeploy.flatMap(({ instanceIds: ids }) => ids);

        // Non-managed-integration services are shown as gray chips (ECF deployed on a different path).
        const newNonAgentlessStatuses: Record<string, ServiceChipState> = {};
        for (const service of nonAgentlessServices) {
          if (!(service.id in serviceStatuses)) {
            newNonAgentlessStatuses[service.id] = 'instantiating';
          }
        }

        // Services deselected from Step 1 never call removeDeployInstance, so pendingCleanupPolicyIds
        // won't capture them. Detect stale entries by comparing policyIdsByInstance against the
        // reconciled deployGroups (which already filters by selectedServiceIds).
        const activeInstanceIds = new Set(deployGroups.flatMap((g) => g.instanceIds));
        const liveStalePolicyIds: Record<string, string> = {};
        for (const [iid, pid] of Object.entries(policyIdsByInstance)) {
          if (!activeInstanceIds.has(iid)) liveStalePolicyIds[iid] = pid;
        }
        const effectivePendingCleanup: Record<string, string> = {
          ...liveStalePolicyIds,
          ...(pendingCleanupPolicyIds ?? {}),
        };

        const hasPendingCleanup = Object.keys(effectivePendingCleanup).length > 0;

        if (
          targets.length === 0 &&
          Object.keys(newNonAgentlessStatuses).length === 0 &&
          !hasPendingCleanup
        ) {
          onContinue();
          // Everything is already deployed: the only work left is a template-details write that failed
          // last time.
          await persistPendingIacTemplate();
          return;
        }

        const initialStatuses = buildInstanceStatuses(targets, []);
        if (hasPendingCleanup || targets.length > 0) setIsDeploying(true);
        updateDetectAndReviewStep({
          isDeploying: hasPendingCleanup || targets.length > 0,
          serviceStatuses: { ...initialStatuses, ...newNonAgentlessStatuses },
        });
        onContinue();

        let cleanupFailed = false;
        if (hasPendingCleanup) {
          cleanupOps = await cleanupManagedIntegrationsPolicies({
            pendingCleanupPolicyIds: effectivePendingCleanup,
            currentPolicyIdsByInstance: policyIdsByInstance,
            instances: serviceSettings?.instances ?? [],
            storedServiceVars: serviceSettings?.serviceVars ?? {},
            globalRegion: serviceSettings?.globalRegion ?? '',
            namespace,
            authenticateAndDeployStep,
            servicesMap: servicesMap ?? new Map(),
          });
          // Only prune instances whose policy cleanup actually succeeded — failed cleanups
          // remain in pendingCleanupPolicyIds for retry on the next deploy attempt.
          const succeededIds = new Set([
            ...cleanupOps.toDelete,
            ...cleanupOps.toUpdate.map((u) => u.policyId),
          ]);
          const cleanedLiveStale = Object.keys(liveStalePolicyIds).filter((id) =>
            succeededIds.has(liveStalePolicyIds[id])
          );
          // Prune stale instances before clearing the staging area (removeDeployInstances
          // must come first so its write isn't overwritten).
          removeDeployInstances(cleanedLiveStale);
          const remainingPending = Object.fromEntries(
            Object.entries(pendingCleanupPolicyIds ?? {}).filter(
              ([, policyId]) => !succeededIds.has(policyId)
            )
          );
          updateDetectAndReviewStep({ pendingCleanupPolicyIds: remainingPending });
          cleanupFailed = Object.keys(remainingPending).length > 0;
        }

        if (targets.length === 0) {
          setIsDeploying(false);
          if (cleanupFailed) {
            // Cleanup did not fully succeed — keep the section actionable so the user can retry.
            updateDetectAndReviewStep({ isDeploying: false });
            return;
          }
          // Cleanup-only success: prune deleted policies from the SO record.
          if (
            onboardingDeploymentId &&
            (cleanupOps.toDelete.length > 0 || cleanupOps.toUpdate.length > 0)
          ) {
            const deletedIds = new Set(cleanupOps.toDelete);
            await updateDeployment(onboardingDeploymentId, {
              services: selectedServiceIds,
              packagePolicyIds: [
                ...new Set(Object.values(policyIdsByInstance).filter((id) => !deletedIds.has(id))),
              ],
            });
          }
          await persistPendingIacTemplate();
          return;
        }
      } else {
        // Retry: select any group that intersects the requested instanceIds.
        // A bundled group is re-run as a whole — retrying one bundled original re-runs its bundle.
        const retrySet = new Set(instanceIds);
        groupsToDeploy = deployGroups.filter(({ instanceIds: ids }) =>
          ids.some((id) => retrySet.has(id))
        );
        // Expand to the full set of ids actually being re-deployed (may be wider than retrySet
        // when a bundled group is included). A stale id that's no longer in any group is silently
        // dropped — otherwise it would be set to 'instantiating' and never resolved.
        const deployedTargets = groupsToDeploy.flatMap(({ instanceIds: ids }) => ids);
        const retryStatuses = buildInstanceStatuses(deployedTargets, []);
        const remainingFailed = failedInstances.filter((id) => !deployedTargets.includes(id));

        // Cleanup must run on retry too — pending/live-stale policies are not bound to initial deploys.
        const retryActiveIds = new Set(deployGroups.flatMap((g) => g.instanceIds));
        const retryLiveStale: Record<string, string> = {};
        for (const [iid, pid] of Object.entries(policyIdsByInstance)) {
          if (!retryActiveIds.has(iid)) retryLiveStale[iid] = pid;
        }
        const retryPending: Record<string, string> = {
          ...retryLiveStale,
          ...(pendingCleanupPolicyIds ?? {}),
        };
        // Mark as deploying before awaiting cleanup so a double-click cannot start a second run.
        setIsDeploying(true);
        updateDetectAndReviewStep({ isDeploying: true });
        if (Object.keys(retryPending).length > 0) {
          cleanupOps = await cleanupManagedIntegrationsPolicies({
            pendingCleanupPolicyIds: retryPending,
            currentPolicyIdsByInstance: policyIdsByInstance,
            instances: serviceSettings?.instances ?? [],
            storedServiceVars: serviceSettings?.serviceVars ?? {},
            globalRegion: serviceSettings?.globalRegion ?? '',
            namespace,
            authenticateAndDeployStep,
            servicesMap: servicesMap ?? new Map(),
          });
          const retrySucceeded = new Set([
            ...cleanupOps.toDelete,
            ...cleanupOps.toUpdate.map((u) => u.policyId),
          ]);
          removeDeployInstances(
            Object.keys(retryLiveStale).filter((id) => retrySucceeded.has(retryLiveStale[id]))
          );
          updateDetectAndReviewStep({
            pendingCleanupPolicyIds: Object.fromEntries(
              Object.entries(pendingCleanupPolicyIds ?? {}).filter(
                ([, policyId]) => !retrySucceeded.has(policyId)
              )
            ),
          });
        }

        updateDetectAndReviewStep({
          serviceStatuses: retryStatuses,
          failedInstances: remainingFailed,
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
      if (currentOnboardingDeploymentId) {
        await updateDeployment(currentOnboardingDeploymentId, {
          services: selectedServiceIds,
          serviceVars: toSOServiceVars(
            serviceSettings?.serviceVars ?? {},
            servicesMap ?? new Map()
          ) as Record<string, Record<string, unknown>>,
          packagePolicyIds: [
            ...new Set(
              Object.values({
                ...policyIdsByInstance,
                ...newPolicyIdsByInstance,
              }).filter((id) => !deletedPolicyIds.has(id))
            ),
          ],
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
      });
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
