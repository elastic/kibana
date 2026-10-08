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
import { DEFAULT_NAMESPACE } from './deploy_group_helpers';
import { toSOAuthMethod } from './agent_based_section/credential_method_selector';
import { cleanupAgentBasedPolicies, updateAgentBasedPolicy } from './policy_cleanup_agent_based';
import { useOnboardingSO } from './use_onboarding_so';
import {
  fetchPackagePolicySecretRefs,
  filterSecretRefsForMethod,
  withoutCoveredCredentials,
} from './secret_refs';
import type { ExistingSecretRefs } from './secret_refs';
import { runWithSharedSecrets } from './shared_secrets';
import {
  collectExtensionResults,
  mergeExtensionResults,
  newMembersByPolicy,
  planPolicyReuse,
} from './reuse_package_policy';
import {
  buildLiveStalePolicyIds,
  buildEffectivePendingCleanup,
  pickSecretSourcePolicyId,
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
  /** Update the in-memory credential values used on the next deploy. Secrets (secret_access_key,
   *  session_token) are kept in a ref — never written to session storage. */
  setAgentCredentials: (creds: AgentCredentialVars | undefined) => void;
  /** Deployed package policy whose stored secrets the credential forms can offer to keep: the
   *  first one a pending cleanup does not delete. Undefined when none survives. */
  secretSourcePolicyId: string | undefined;
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

  const [isDeploying, setIsDeploying] = useState(false);
  // In-memory credential ref — secrets (secret_access_key, session_token) are never persisted.
  const agentCredentialsRef = useRef<AgentCredentialVars | undefined>(undefined);
  const setAgentCredentials = useCallback((creds: AgentCredentialVars | undefined) => {
    agentCredentialsRef.current = creds;
  }, []);
  // Not seeded from detectAndReviewStep.failedInstances: MI also writes that key, so seeding
  // would surface stale MI failures as agent-based errors. agentPolicyId is the success flag.
  const [failedInstances, setFailedInstances] = useState<string[]>([]);

  const targets: DeployGroup[] = useMemo(
    () =>
      buildAgentBasedTargets(
        serviceSettings?.instances ?? [],
        selectedServiceIds,
        servicesMap ?? new Map(),
        serviceSettings?.serviceVars ?? {}
      ),
    [serviceSettings?.instances, serviceSettings?.serviceVars, selectedServiceIds, servicesMap]
  );

  // true when every target has a package policy and no cleanup is pending. false on pending
  // cleanup so handleNext calls handleDeploy (which runs cleanup even with no new targets).
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
      // Retry: groups with at least one failed instance. Fresh: skip already-deployed groups,
      // except isNewPolicySwitch (new mode, no flyout yet) — always include all instances.
      const isNewPolicySwitch =
        !isRetry &&
        agentBasedDeployment.agentHostsMode === 'new' &&
        !agentBasedDeployment.agentPolicyId;
      // Like isNewPolicySwitch but also true on Retry — used for cleanup staging and policyIdsByInstance preservation.
      const isNewPolicyDeploy =
        agentBasedDeployment.agentHostsMode === 'new' && !agentBasedDeployment.agentPolicyId;
      const targetsToDeploy = isRetry
        ? targets.filter((g) => g.instanceIds.some((id) => instanceIds.includes(id)))
        : isNewPolicySwitch
        ? targets
        : targets.filter((g) => g.instanceIds.some((id) => !alreadyDeployedIds.has(id)));

      // Step-1 deselections skip removeDeployInstance — detect stale entries via reconciled targets.
      const activeInstanceIds = new Set(targets.flatMap((g) => g.instanceIds));
      const liveStalePolicyIds = buildLiveStalePolicyIds(
        detectAndReviewStep.policyIdsByInstance ?? {},
        activeInstanceIds
      );
      // Snapshot old policies before new-policy deploy — stage cleanup only after success so a
      // failed creation leaves IDs intact for Retry. isNewPolicyDeploy covers Retry too.
      const oldPolicyIdsByInstance: Record<string, string> = isNewPolicyDeploy
        ? { ...(detectAndReviewStep.policyIdsByInstance ?? {}) }
        : {};
      const effectivePendingCleanup = buildEffectivePendingCleanup(
        liveStalePolicyIds,
        detectAndReviewStep.pendingCleanupPolicyIds
      );

      const hasPendingCleanup = Object.keys(effectivePendingCleanup).length > 0;

      if (
        targetsToDeploy.length === 0 &&
        !hasPendingCleanup &&
        !(detectAndReviewStep.isDirty ?? false)
      ) {
        // No deploy targets and no cleanup to run, but the service selection may still have
        // changed (e.g., a previously-failed service with no package policy was deselected).
        // Reconcile the SO services list so resume reflects the current selection.
        const existingDeploymentId = detectAndReviewStep.onboardingDeploymentId;
        if (existingDeploymentId) {
          const remainingPolicyIdsByInstance = detectAndReviewStep.policyIdsByInstance ?? {};
          await updateDeployment(existingDeploymentId, {
            services: selectedServiceIds,
            serviceVars: toSOServiceVars(
              serviceSettings?.serviceVars ?? {},
              servicesMap ?? new Map()
            ) as Record<string, Record<string, unknown>>,
            packagePolicyIds: [...new Set(Object.values(remainingPolicyIdsByInstance))],
          });
        }
        return { failed: false };
      }

      setIsDeploying(true);
      updateDetectAndReviewStep({ isDeploying: true });

      // Hoisted for best-effort SO update in the catch block.
      let onboardingDeploymentId = detectAndReviewStep.onboardingDeploymentId;
      let resolvedAgentPolicyIds: string[] = [];
      const { agentHostsMode, agentPolicyId, selectedAgentPolicyIds, agentCredentialMethod } =
        agentBasedDeployment;
      const globalRegion = serviceSettings?.globalRegion ?? '';
      const storedServiceVars = serviceSettings?.serviceVars ?? {};
      const { dataFormat } = servicesStep;
      const targetPolicyIds =
        agentHostsMode === 'existing'
          ? selectedAgentPolicyIds ?? []
          : agentPolicyId
          ? [agentPolicyId]
          : selectedAgentPolicyIds ?? [];

      try {
        // A group whose package already has a package policy joins it (PUT) instead of creating a
        // second one. A new agent policy recreates every package policy, so nothing is reused.
        const { createGroups, extensions } = isNewPolicyDeploy
          ? { createGroups: targetsToDeploy, extensions: [] }
          : planPolicyReuse(
              targetsToDeploy,
              targets,
              detectAndReviewStep.policyIdsByInstance ?? {}
            );

        // New package policies reuse the keys the user kept from an already deployed one. Read
        // before cleanup, from a policy cleanup keeps: deleting the policy that holds a secret
        // deletes the secret, so refs read from it would dangle.
        const credentials = agentCredentialsRef.current;
        const typedCreds = credentials;
        const keysMethod =
          agentCredentialMethod === 'static_keys' || agentCredentialMethod === 'temporary_keys'
            ? agentCredentialMethod
            : undefined;
        const isTyped =
          !!typedCreds?.access_key_id &&
          !!typedCreds.secret_access_key &&
          (typedCreds.method !== 'temporary_keys' || !!typedCreds.session_token);
        const keptSecretRefs =
          keysMethod && !isTyped && createGroups.length > 0
            ? filterSecretRefsForMethod(
                await fetchPackagePolicySecretRefs(
                  pickSecretSourcePolicyId(
                    detectAndReviewStep.policyIdsByInstance ?? {},
                    effectivePendingCleanup
                  )
                ),
                keysMethod
              )
            : undefined;

        // Typed keys that Fleet will store as new secrets (not kept or replaced-in-full ones).
        const hasTypedKeys =
          !!keysMethod &&
          Boolean(
            typedCreds?.access_key_id || typedCreds?.secret_access_key || typedCreds?.session_token
          );
        const withoutCoveredSecrets = (
          creds: AgentCredentialVars | undefined,
          refs: ExistingSecretRefs
        ) => creds && withoutCoveredCredentials(creds, refs);

        // Refs of the secret this run stored for typed keys (a cleanup, dirty or extension update):
        // every policy written afterwards uses it instead of storing them again.
        let storedSharedRefs: ExistingSecretRefs | undefined;
        // A policy is written once per run, by the first phase that reaches it (cleanup, dirty
        // update, or the extension below). Every write is built from the current settings and
        // covers the surviving members plus the added ones, so later phases skip it.
        const claimedPolicyIds = new Set<string>();
        const addedMembers = newMembersByPolicy(
          extensions,
          detectAndReviewStep.policyIdsByInstance ?? {}
        );

        const baseOpts = {
          namespace: DEFAULT_NAMESPACE,
          globalRegion,
          storedServiceVars,
          authenticateAndDeployStep: {
            ...authenticateAndDeployStep,
            existingSecretRefs: keptSecretRefs,
          },
          pkgVersion: '', // overridden per-package inside deploy functions
          agentCredentials: credentials,
        };

        // Cleaned instance IDs — excluded from packagePolicyIds in the SO update.
        let cleanedLiveStale: string[] = [];
        // Hoisted so the cleanup-only early return can decide whether to refresh the SO.
        let remainingPending: Record<string, string> =
          detectAndReviewStep.pendingCleanupPolicyIds ?? {};

        // Clean up package policies for removed services before creating new ones.
        if (hasPendingCleanup) {
          const cleanupOps = await cleanupAgentBasedPolicies({
            pendingCleanupPolicyIds: effectivePendingCleanup,
            currentPolicyIdsByInstance: detectAndReviewStep.policyIdsByInstance ?? {},
            instances: serviceSettings?.instances ?? [],
            storedServiceVars,
            globalRegion,
            namespace: DEFAULT_NAMESPACE,
            authenticateAndDeployStep,
            servicesMap: servicesMap ?? new Map(),
            // Keep the policy's current policy_ids, unless this run also applies a changed agent
            // policy selection: the update here is then the only write the policy gets.
            selectedAgentPolicyIds:
              (detectAndReviewStep.isDirty ?? false) &&
              !isNewPolicyDeploy &&
              detectAndReviewStep.isPolicySelectionDirty
                ? targetPolicyIds
                : [],
            agentCredentials: credentials,
            hasTypedSecrets: hasTypedKeys,
            extraMembersByPolicy: addedMembers,
          });
          storedSharedRefs = cleanupOps.sharedRefs;
          cleanupOps.toUpdate.forEach(({ policyId }) => claimedPolicyIds.add(policyId));
          // Only prune successfully cleaned instances — failures stay in pendingCleanupPolicyIds.
          const succeededIds = new Set([
            ...cleanupOps.toDelete,
            ...cleanupOps.toUpdate.map((u) => u.policyId),
          ]);
          // No update semantics in agent-based — no survivingInstanceIds filter needed.
          cleanedLiveStale = buildCleanedLiveStale(liveStalePolicyIds, succeededIds);
          removeDeployInstances(cleanedLiveStale);
          remainingPending = buildRemainingPending(
            detectAndReviewStep.pendingCleanupPolicyIds,
            succeededIds
          );
          updateDetectAndReviewStep({ pendingCleanupPolicyIds: remainingPending });
        }

        // Updates one package policy to cover the given instances. `shared` holds the refs of a
        // secret an earlier update stored for the typed keys; those keys are then not sent again.
        const updatePolicyWithRefs = (
          policyId: string,
          ids: string[],
          shared: ExistingSecretRefs | undefined
        ) =>
          updateAgentBasedPolicy(policyId, ids, {
            instances: serviceSettings?.instances ?? [],
            storedServiceVars,
            globalRegion,
            namespace: DEFAULT_NAMESPACE,
            authenticateAndDeployStep: shared
              ? { ...authenticateAndDeployStep, existingSecretRefs: shared }
              : authenticateAndDeployStep,
            servicesMap: servicesMap ?? new Map(),
            // Only override policy_ids when the selection drifted; otherwise a var-only redeploy
            // would detach agent policies attached outside the wizard.
            selectedAgentPolicyIds: detectAndReviewStep.isPolicySelectionDirty
              ? targetPolicyIds
              : [],
            agentCredentials: shared ? withoutCoveredSecrets(credentials, shared) : credentials,
          });

        // Update deployed policies with current settings (isDirty). Runs before new targets so
        // add-service+edit updates existing policies in the same run. Skipped on isNewPolicyDeploy
        // (covers both the initial new-policy switch and Retry of a failed creation) — updating
        // old policies before the replacement is created would apply new settings to the wrong
        // agents if the replacement creation fails again.
        let dirtyUpdateApplied = false;
        if ((detectAndReviewStep.isDirty ?? false) && !isNewPolicyDeploy) {
          // Active instances only — exclude cleanedLiveStale and deselected instances.
          const byPolicy = new Map<string, string[]>();
          for (const [instanceId, policyId] of Object.entries(
            detectAndReviewStep.policyIdsByInstance ?? {}
          )) {
            if (cleanedLiveStale.includes(instanceId) || !activeInstanceIds.has(instanceId))
              continue;
            if (!byPolicy.has(policyId)) byPolicy.set(policyId, []);
            byPolicy.get(policyId)!.push(instanceId);
          }
          for (const [policyId, ids] of Object.entries(addedMembers)) {
            byPolicy.get(policyId)?.push(...ids);
          }
          const dirtyItems = [...byPolicy.entries()].filter(
            ([policyId]) => !claimedPolicyIds.has(policyId)
          );
          if (dirtyItems.length > 0) {
            // Typed keys become new Fleet secrets: store them once on the first package policy
            // and have the others (and this run's new ones) use that secret.
            const { results: redeployResults, sharedRefs } = await runWithSharedSecrets({
              items: dirtyItems,
              hasTypedSecrets: hasTypedKeys,
              initialRefs: storedSharedRefs,
              // An update can delete the secret it replaced: finish one before starting the next.
              sequential: true,
              run: ([policyId, instanceIdsForPolicy], shared) =>
                updatePolicyWithRefs(policyId, instanceIdsForPolicy, shared),
              getPolicyId: ([policyId]) => policyId,
              fetchRefs: fetchPackagePolicySecretRefs,
            });
            storedSharedRefs = sharedRefs ?? storedSharedRefs;
            redeployResults.forEach((result, i) => {
              if (result.status === 'fulfilled') claimedPolicyIds.add(dirtyItems[i][0]);
              if (result.status === 'rejected') {
                // eslint-disable-next-line no-console
                console.error(
                  'Failed to update agent-based policy during dirty redeploy:',
                  result.reason
                );
              }
            });
            if (redeployResults.some((r) => r.status === 'rejected')) {
              // Also include undeployed new targets so Retry re-queues them alongside policy updates.
              const allActiveIds = [
                ...Object.keys(detectAndReviewStep.policyIdsByInstance ?? {}).filter(
                  (id) => activeInstanceIds.has(id) && !cleanedLiveStale.includes(id)
                ),
                ...targetsToDeploy
                  .flatMap((g) => g.instanceIds)
                  .filter((id) => !alreadyDeployedIds.has(id)),
              ];
              const errorMsg =
                'Failed to update package policy with new settings. Click Retry to try again.';
              setIsDeploying(false);
              setFailedInstances(allActiveIds);
              updateDetectAndReviewStep({
                isDeploying: false,
                failedInstances: allActiveIds,
                deployErrors: Object.fromEntries(allActiveIds.map((id) => [id, errorMsg])),
              });
              return { failed: true };
            }
          }

          // Mark applied so SO writes include new settings and the cleanup-only path clears isDirty.
          dirtyUpdateApplied = true;

          // Pure dirty redeploy (no new targets, cleanup fully succeeded) — fall through if partial.
          if (targetsToDeploy.length === 0 && Object.keys(remainingPending).length === 0) {
            if (onboardingDeploymentId) {
              const postCleanupIds = Object.fromEntries(
                Object.entries(detectAndReviewStep.policyIdsByInstance ?? {}).filter(
                  ([id]) => !cleanedLiveStale.includes(id)
                )
              );
              // Keep isDirty if SO write fails so settings change isn't silently lost.
              const soOk = await updateDeployment(onboardingDeploymentId, {
                services: selectedServiceIds,
                serviceVars: toSOServiceVars(storedServiceVars, servicesMap ?? new Map()) as Record<
                  string,
                  Record<string, unknown>
                >,
                packagePolicyIds: [...new Set(Object.values(postCleanupIds))],
                policyIdsByInstance: postCleanupIds,
                authMethod: toSOAuthMethod(agentCredentialMethod),
                // Persist agentPolicyIds for resume.
                ...(targetPolicyIds.length > 0 ? { agentPolicyIds: targetPolicyIds } : {}),
              });
              if (!soOk) {
                setIsDeploying(false);
                updateDetectAndReviewStep({ isDeploying: false });
                return { failed: true };
              }
            }
            setIsDeploying(false);
            // Clear stale failures so agentHasFailed doesn't linger after a successful dirty redeploy.
            setFailedInstances([]);
            updateDetectAndReviewStep({
              isDeploying: false,
              isDirty: false,
              isPolicySelectionDirty: false,
              failedInstances: [],
            });
            return { failed: false };
          }
          // If cleanup partially failed OR there are new targets, fall through.
        }

        if (targetsToDeploy.length === 0) {
          setIsDeploying(false);
          // Refresh SO services only when all cleanup succeeded (explicit + live-stale).
          const allLiveStaleSucceeded = Object.keys(liveStalePolicyIds).every((id) =>
            cleanedLiveStale.includes(id)
          );
          const cleanupComplete =
            Object.keys(remainingPending).length === 0 && allLiveStaleSucceeded;
          // Only clear isDirty when the SO is also written: if cleanup is partial the SO stays
          // stale, so isDirty must remain true to prevent drift check from treating it as clean.
          updateDetectAndReviewStep({
            isDeploying: false,
            ...(dirtyUpdateApplied && cleanupComplete
              ? { isDirty: false, isPolicySelectionDirty: false }
              : {}),
          });
          if (onboardingDeploymentId && cleanupComplete) {
            // Build the post-cleanup policy map: exclude instance IDs removed by cleanup so the
            // persisted packagePolicyIds and policyIdsByInstance don't reference deleted policies.
            const postCleanupPolicyIdsByInstance = Object.fromEntries(
              Object.entries(detectAndReviewStep.policyIdsByInstance ?? {}).filter(
                ([id]) => !cleanedLiveStale.includes(id)
              )
            );
            await updateDeployment(onboardingDeploymentId, {
              services: selectedServiceIds,
              serviceVars: toSOServiceVars(storedServiceVars, servicesMap ?? new Map()) as Record<
                string,
                Record<string, unknown>
              >,
              packagePolicyIds: [...new Set(Object.values(postCleanupPolicyIdsByInstance))],
              policyIdsByInstance: postCleanupPolicyIdsByInstance,
            });
          }
          // Cleanup is best-effort — any entries that couldn't be cleared remain staged for
          // the next deploy attempt. Don't block navigation on a cleanup-only run.
          return { failed: false };
        }

        // ── SO create (best-effort, skipped when an ID already exists) ──────────
        // !onboardingDeploymentId is the only guard needed: it prevents double-creation on
        // Back→Next re-entry (id set from prior deploy) and on retry when the first deploy
        // succeeded in creating the record. Intentionally NOT guarded on !isRetry: if the
        // initial SO create failed (returned null) and the deploy then failed, a retry must
        // still be able to create the record so the successful Fleet result has a durable home.
        if (!onboardingDeploymentId) {
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

        // Services joining an existing package policy. Policies a cleanup or dirty update already
        // wrote this run took the new services with them.
        const unwritten = extensions.filter(({ policyId }) => !claimedPolicyIds.has(policyId));
        const { results: attemptedResults, sharedRefs: extensionRefs } = await runWithSharedSecrets(
          {
            items: unwritten,
            hasTypedSecrets: hasTypedKeys,
            initialRefs: storedSharedRefs,
            // An update can delete the secret it replaced: finish one before starting the next.
            sequential: true,
            run: ({ policyId, memberInstanceIds }, shared) =>
              updatePolicyWithRefs(policyId, memberInstanceIds, shared),
            getPolicyId: ({ policyId }) => policyId,
            fetchRefs: fetchPackagePolicySecretRefs,
          }
        );
        storedSharedRefs = extensionRefs ?? storedSharedRefs;
        attemptedResults.forEach((result) => {
          if (result.status === 'rejected') {
            // eslint-disable-next-line no-console
            console.error('Failed to add service to agent-based package policy:', result.reason);
          }
        });
        const extensionResults = mergeExtensionResults(extensions, unwritten, attemptedResults);
        const extended = collectExtensionResults(extensions, extensionResults);
        // New package policies use the secret the updates above stored, not another one.
        if (storedSharedRefs) {
          baseOpts.authenticateAndDeployStep = {
            ...authenticateAndDeployStep,
            existingSecretRefs: storedSharedRefs,
          };
          baseOpts.agentCredentials = withoutCoveredSecrets(credentials, storedSharedRefs);
        }

        let policyIdsByInstance: Record<string, string> = {};
        let failed: string[] = [];
        let errorsByInstance: Record<string, string> = {};

        // Route to the existing-policy path when:
        // - agentHostsMode === 'existing': user selected an existing policy.
        // - agentPolicyId is already set: the flyout created the policy on a previous attempt
        //   (including the very first Next click when the flyout ran), so we target the existing
        //   policy to avoid creating a second one (double-creation guard applies on retry too).
        if (createGroups.length === 0) {
          // Everything joined an existing package policy; no new one is created.
          resolvedAgentPolicyIds = targetPolicyIds;
        } else if (agentHostsMode === 'existing' || agentPolicyId) {
          resolvedAgentPolicyIds = targetPolicyIds;

          const result = await deployToExistingAgentPolicies(createGroups, {
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
            const result = await deployNewAgentPolicy(createGroups, {
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
            failed = createGroups.flatMap((g) => g.instanceIds);
            errorsByInstance = Object.fromEntries(failed.map((id) => [id, msg]));
          }
        }
        policyIdsByInstance = { ...policyIdsByInstance, ...extended.policyIdsByInstance };
        failed = [...failed, ...extended.failedInstances];
        errorsByInstance = { ...errorsByInstance, ...extended.errorsByInstance };

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
        let soOk = true;
        // Default true: when there is no deployment record to update, there is no cleanup to track
        // either, so the failure return and isDirty-clear conditions below degrade gracefully.
        let cleanupFullySucceeded = true;
        if (onboardingDeploymentId) {
          // Build the persisted policy-ID list from the post-cleanup snapshot: filter out
          // instance IDs removed by cleanup (cleanedLiveStale) before merging with current
          // deploy results, so deleted package-policy IDs aren't persisted alongside new ones.
          const priorIds = Object.fromEntries(
            Object.entries(detectAndReviewStep.policyIdsByInstance ?? {}).filter(
              ([id]) => !cleanedLiveStale.includes(id)
            )
          );
          // Only persist the reduced services list when all cleanup succeeded — both explicit
          // pendingCleanupPolicyIds and live-stale entries (Step 1 deselections). A failed
          // live-stale cleanup is not tracked in remainingPending, so check both.
          const allLiveStaleSucceededInDeploy = Object.keys(liveStalePolicyIds).every((id) =>
            cleanedLiveStale.includes(id)
          );
          cleanupFullySucceeded =
            Object.keys(remainingPending).length === 0 && allLiveStaleSucceededInDeploy;
          soOk = await updateDeployment(onboardingDeploymentId, {
            ...(resolvedAgentPolicyIds.length ? { agentPolicyIds: resolvedAgentPolicyIds } : {}),
            packagePolicyIds: [...new Set(Object.values({ ...priorIds, ...policyIdsByInstance }))],
            // Always update mechanisms so that a record originally created for managed_integration
            // (when the user switched deployment method after a failed MI attempt) is corrected.
            // Without this, agent-based PUTs using assume_role are rejected by the handler, and
            // static_keys PUTs succeed but hydrate back into managed_integration mode on resume.
            mechanisms: ['agent_based'],
            // Clear the connectorId when reusing an MI-created record. MI creates with a connector
            // association; agent-based never uses one. If not cleared, the agent-based record remains
            // returned for the unrelated cloud connector (getByConnectorId), matching MI→ECF behavior.
            connectorId: null,
            // Refresh authMethod so a credential-method change between deploys (Back→change→Next)
            // is reflected on resume rather than presenting the original method's form.
            authMethod: toSOAuthMethod(agentCredentialMethod),
            status: mergedFailed.length === 0 ? 'succeeded' : 'failed',
            // Persist per-instance package-policy mapping on success. New-policy mode: use only
            // the freshly created IDs (priorIds reference the old cleanup targets). Existing-policy
            // mode: merge priorIds so added-service IDs are not lost on resume (without this, the
            // SO keeps its old map and treats the added service as undeployed, creating a duplicate).
            ...(mergedFailed.length === 0
              ? {
                  policyIdsByInstance: isNewPolicyDeploy
                    ? policyIdsByInstance
                    : { ...priorIds, ...policyIdsByInstance },
                }
              : {}),
            // Only update services when cleanup fully succeeded: if cleanup partially failed,
            // the stale policies are still live. Reducing services before they are removed
            // would lose the pending-cleanup record on resume, leaving orphaned policies.
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
          // When a new-policy deploy fails, preserve the old policyIdsByInstance so Retry can
          // capture them in oldPolicyIdsByInstance and stage cleanup after a successful retry.
          // deployNewAgentPolicy is transactional — Fleet state is unchanged on failure.
          ...(isNewPolicyDeploy && mergedFailed.length > 0 ? {} : { policyIdsByInstance }),
          failedInstances: mergedFailed,
          deployErrors: mergedErrors,
          // Clear drift flag only when: (a) the SO write confirmed the new state and (b) cleanup
          // fully succeeded so the SO services list was updated. If cleanup partially failed, isDirty
          // stays true so the user retries the full dirty+cleanup cycle rather than silently losing
          // the cleanup record.
          ...(dirtyUpdateApplied && mergedFailed.length === 0 && soOk && cleanupFullySucceeded
            ? { isDirty: false, isPolicySelectionDirty: false }
            : {}),
          // When switching to 'new' agent-policy mode, deployNewAgentPolicy created fresh package
          // policies. The old package policies (on previous agent policies) are now orphaned.
          // Stage them for cleanup on the next deploy ONLY after successful creation — staging
          // before creation would delete old policies before the replacement exists, making
          // Retry impossible if creation failed.
          // isNewPolicyDeploy (not isNewPolicySwitch) so retries of a failed creation also stage
          // cleanup when they eventually succeed.
          ...(isNewPolicyDeploy &&
          mergedFailed.length === 0 &&
          Object.keys(oldPolicyIdsByInstance).length > 0
            ? { pendingCleanupPolicyIds: { ...remainingPending, ...oldPolicyIdsByInstance } }
            : {}),
        });
        // Block navigation when the SO write failed or cleanup did not fully complete: the updated
        // settings are not durable, or stale policies remain. isDirty and pendingCleanupPolicyIds
        // stay set so a retry re-runs the full cycle.
        return { failed: mergedFailed.length > 0 || !soOk || !cleanupFullySucceeded };
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
            // Mirror the success-path update: keep mechanisms and connectorId consistent so an
            // MI-created record that was switched to agent-based doesn't resume as MI after an
            // unexpected throw (the handler rejects assume_role against stored MI mechanisms).
            mechanisms: ['agent_based'],
            connectorId: null,
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
      serviceSettings,
      selectedServiceIds,
      authenticateAndDeployStep,
      agentBasedDeployment,
      setAgentBasedDeployment,
      detectAndReviewStep,
      updateDetectAndReviewStep,
      removeDeployInstances,
      getLatestFailedInstances,
      servicesStep,
      servicesMap,
      createDeployment,
      updateDeployment,
      persistDeploymentId,
    ]
  );

  const secretSourcePolicyId = useMemo(() => {
    const policyIdsByInstance = detectAndReviewStep.policyIdsByInstance ?? {};
    const activeInstanceIds = new Set(targets.flatMap((g) => g.instanceIds));
    return pickSecretSourcePolicyId(
      policyIdsByInstance,
      buildEffectivePendingCleanup(
        buildLiveStalePolicyIds(policyIdsByInstance, activeInstanceIds),
        detectAndReviewStep.pendingCleanupPolicyIds
      )
    );
  }, [
    targets,
    detectAndReviewStep.policyIdsByInstance,
    detectAndReviewStep.pendingCleanupPolicyIds,
  ]);

  return {
    targets,
    isDeploying,
    failedInstances,
    isAlreadyDeployed,
    handleDeploy,
    setAgentCredentials,
    secretSourcePolicyId,
  };
}
