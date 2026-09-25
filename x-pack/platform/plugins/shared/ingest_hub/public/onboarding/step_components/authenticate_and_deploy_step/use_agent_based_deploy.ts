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
import { toSOAuthMethod } from './agent_based_section/credential_method_selector';
import { useOnboardingSO } from './use_onboarding_so';
import { cleanupAgentBasedPolicies } from './policy_cleanup_agent_based';
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

  const { createDeployment, updateDeployment, persistDeploymentId } = useOnboardingSO();

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

      if (targetsToDeploy.length === 0 && !hasPendingCleanup) return { failed: false };

      setIsDeploying(true);
      updateDetectAndReviewStep({ isDeploying: true });

      // Hoisted so the catch block can best-effort update the SO on unexpected errors,
      // including agent policy ids, services, serviceVars, and authMethod known at failure time.
      let onboardingDeploymentId = detectAndReviewStep.onboardingDeploymentId;
      let resolvedAgentPolicyIds: string[] = [];
      const { agentHostsMode, agentPolicyId, selectedAgentPolicyIds, agentCredentialMethod } =
        agentBasedDeployment;
      const globalRegion = serviceSettings?.globalRegion ?? '';
      const storedServiceVars = serviceSettings?.serviceVars ?? {};
      const { dataFormat } = servicesStep;

      try {
        const baseOpts = {
          namespace,
          globalRegion,
          storedServiceVars,
          authenticateAndDeployStep,
          pkgVersion: '', // overridden per-package inside deploy functions
          agentCredentials: agentCredentialsRef.current,
        };

        // Track instance IDs successfully cleaned up so the SO update can exclude their
        // stale policy IDs when building packagePolicyIds.
        let cleanedLiveStale: string[] = [];
        // Hoisted so the cleanup-only early return can decide whether to refresh the SO.
        let remainingPending: Record<string, string> =
          detectAndReviewStep.pendingCleanupPolicyIds ?? {};

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
          cleanedLiveStale = buildCleanedLiveStale(liveStalePolicyIds, succeededIds);
          removeDeployInstances(cleanedLiveStale);
          remainingPending = buildRemainingPending(
            detectAndReviewStep.pendingCleanupPolicyIds,
            succeededIds
          );
          updateDetectAndReviewStep({ pendingCleanupPolicyIds: remainingPending });
        }

        if (targetsToDeploy.length === 0) {
          setIsDeploying(false);
          updateDetectAndReviewStep({ isDeploying: false });
          // Only refresh the SO services list when all cleanup succeeded (remainingPending is
          // empty). If some cleanup failed, preserve the full service list so a resume can retry
          // the failed deletion rather than losing the pending cleanup target permanently.
          if (onboardingDeploymentId && Object.keys(remainingPending).length === 0) {
            await updateDeployment(onboardingDeploymentId, {
              services: selectedServiceIds,
              serviceVars: toSOServiceVars(storedServiceVars, servicesMap ?? new Map()) as Record<
                string,
                Record<string, unknown>
              >,
            });
          }
          // Cleanup is best-effort — any entries that couldn't be cleared remain staged for
          // the next deploy attempt. Don't block navigation on a cleanup-only run.
          return { failed: false };
        }

        // ── SO create (initial deploy only, best-effort) ──────────────────────
        // Mirror the managed-integration guard: !isRetry && !onboardingDeploymentId avoids
        // creating a second SO on Back→Next re-entry and on retry.
        if (!isRetry && !onboardingDeploymentId) {
          onboardingDeploymentId =
            (await createDeployment({
              provider: 'aws',
              mechanisms: ['agent_based'],
              services: selectedServiceIds,
              serviceVars: toSOServiceVars(storedServiceVars, servicesMap ?? new Map()) as Record<
                string,
                Record<string, unknown>
              >,
              globalRegion,
              dataFormat,
              authMethod: toSOAuthMethod(agentCredentialMethod),
              // Persist agentPolicyIds on create so a mid-deploy tab-close leaves a record that
              // hydrates back into existing mode rather than incorrectly creating a new agent policy.
              // - existing mode: target ids are the user-selected set.
              // - pre-created new-policy mode (agentPolicyId already set by flyout): wrap the
              //   singular id so resume sees it and routes to existing mode, not new-policy mode.
              ...(agentHostsMode === 'existing' && selectedAgentPolicyIds?.length
                ? { agentPolicyIds: selectedAgentPolicyIds }
                : agentPolicyId
                ? { agentPolicyIds: [agentPolicyId] }
                : {}),
            })) ?? undefined;
          if (onboardingDeploymentId) persistDeploymentId(onboardingDeploymentId);
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
          resolvedAgentPolicyIds = targetPolicyIds;

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
            resolvedAgentPolicyIds = [result.agentPolicyId];
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

        // On retry, merge current failures with previously failed instances that were not retried,
        // so the SO status reflects the full deployment state — not just the retried subset.
        const mergedFailed = isRetry
          ? [...getLatestFailedInstances().filter((id) => !allTargetIds.includes(id)), ...failed]
          : failed;

        // ── SO update (best-effort) ───────────────────────────────────────────
        // The SO tracks current desired state, not a frozen deploy snapshot. Refreshing
        // services/serviceVars here means a resume after a Back→add-service→Next sequence
        // restores the complete service set, not just what was deployed first.
        if (onboardingDeploymentId) {
          // Build the persisted policy-ID list from the post-cleanup snapshot: filter out
          // instance IDs removed by cleanup (cleanedLiveStale) before merging with current
          // deploy results, so deleted package-policy IDs aren't persisted alongside new ones.
          const priorIds = Object.fromEntries(
            Object.entries(detectAndReviewStep.policyIdsByInstance ?? {}).filter(
              ([id]) => !cleanedLiveStale.includes(id)
            )
          );
          // Only persist the reduced services list when all cleanup succeeded. If cleanup partially
          // failed, remainingPending is non-empty and the old services must be kept so a resume can
          // retry the failed cleanup rather than losing the pending target permanently.
          const cleanupFullySucceeded = Object.keys(remainingPending).length === 0;
          await updateDeployment(onboardingDeploymentId, {
            ...(resolvedAgentPolicyIds.length ? { agentPolicyIds: resolvedAgentPolicyIds } : {}),
            packagePolicyIds: [...new Set(Object.values({ ...priorIds, ...policyIdsByInstance }))],
            // Always update mechanisms so that a record originally created for managed_integration
            // (when the user switched deployment method after a failed MI attempt) is corrected.
            // Without this, agent-based PUTs using assume_role are rejected by the handler, and
            // static_keys PUTs succeed but hydrate back into managed_integration mode on resume.
            mechanisms: ['agent_based'],
            // Refresh authMethod so a credential-method change between deploys (Back→change→Next)
            // is reflected on resume rather than presenting the original method's form.
            authMethod: toSOAuthMethod(agentCredentialMethod),
            status: mergedFailed.length === 0 ? 'succeeded' : 'failed',
            ...(cleanupFullySucceeded
              ? {
                  services: selectedServiceIds,
                  serviceVars: toSOServiceVars(
                    storedServiceVars,
                    servicesMap ?? new Map()
                  ) as Record<string, Record<string, unknown>>,
                }
              : {}),
          });
        }

        // Use mergedFailed (not just the current-attempt `failed`) for local state too.
        // On a partial retry, `failed` contains only the current attempt's failures, so using
        // it directly would clear previously-failed instances from `failedInstances`, causing
        // `isAgentDone` to evaluate as true and advancing Next even though B was never retried.
        setFailedInstances(mergedFailed);
        // Merge errors: keep previous diagnostics for instances not included in this retry so
        // the error callout still shows why B failed even when only A was retried.
        const mergedErrors = isRetry
          ? {
              ...Object.fromEntries(
                Object.entries(detectAndReviewStep.deployErrors ?? {}).filter(
                  ([id]) => !allTargetIds.includes(id)
                )
              ),
              ...errorsByInstance,
            }
          : errorsByInstance;
        updateDetectAndReviewStep({
          isDeploying: false,
          serviceStatuses: statuses,
          policyIdsByInstance,
          failedInstances: mergedFailed,
          deployErrors: mergedErrors,
        });
        return { failed: mergedFailed.length > 0 };
      } catch (err) {
        // Unexpected error — mark all retried instances as failed.
        const msg = extractErrorMessage(err);
        const allIds = targetsToDeploy.flatMap((g) => g.instanceIds);
        // On a partial retry, merge with previously-failed instances that were not retried.
        // Without this, B (failed previously, not retried) disappears from the failure set; a
        // later successful retry of A can then compute an empty merged set and mark the SO
        // succeeded even though B was never retried.
        const mergedCatchFailed = isRetry
          ? [...getLatestFailedInstances().filter((id) => !allIds.includes(id)), ...allIds]
          : allIds;
        const statuses = buildAgentBasedInstanceStatuses(targetsToDeploy, allIds);
        setFailedInstances(mergedCatchFailed);
        const catchErrors = isRetry
          ? {
              ...Object.fromEntries(
                Object.entries(detectAndReviewStep.deployErrors ?? {}).filter(
                  ([id]) => !allIds.includes(id)
                )
              ),
              ...Object.fromEntries(allIds.map((id) => [id, msg])),
            }
          : Object.fromEntries(allIds.map((id) => [id, msg]));
        updateDetectAndReviewStep({
          isDeploying: false,
          serviceStatuses: statuses,
          failedInstances: mergedCatchFailed,
          deployErrors: catchErrors,
        });
        // Best-effort: mark the SO as failed so resume doesn't see a stale 'pending' record.
        // Include agent policy ids, services, serviceVars and authMethod known at failure time
        // so a resumed-after-unexpected-error deployment restores the correct service set and
        // credential method, not a stale snapshot from a prior successful deploy.
        if (onboardingDeploymentId) {
          await updateDeployment(onboardingDeploymentId, {
            ...(resolvedAgentPolicyIds.length ? { agentPolicyIds: resolvedAgentPolicyIds } : {}),
            services: selectedServiceIds,
            serviceVars: toSOServiceVars(storedServiceVars, servicesMap ?? new Map()) as Record<
              string,
              Record<string, unknown>
            >,
            authMethod: toSOAuthMethod(agentCredentialMethod),
            status: 'failed',
          });
        }
        return { failed: true };
      } finally {
        setIsDeploying(false);
      }
    },
    [
      targets,
      namespace,
      serviceSettings,
      authenticateAndDeployStep,
      agentBasedDeployment,
      setAgentBasedDeployment,
      detectAndReviewStep,
      updateDetectAndReviewStep,
      removeDeployInstances,
      getLatestFailedInstances,
      selectedServiceIds,
      servicesStep,
      servicesMap,
      createDeployment,
      updateDeployment,
      persistDeploymentId,
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
