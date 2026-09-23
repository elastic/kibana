/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { sendUpdateCloudConnector, sendVerifyCloudConnectorIacKey } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { ServiceChipState } from '../../onboarding_flow_context';
import { SERVICE_SETTINGS_SESSION_KEY } from '../service_settings_step/use_service_settings';
import type { ServiceSettingsPersistedState } from '../service_settings_step/use_service_settings';
import {
  buildDeployGroups,
  buildInstanceStatuses,
  collectDeployResults,
  deployGroup,
} from './deploy_groups';
import type { DeployGroup } from './deploy_groups';
import { buildIacIntegrations, toSOServiceVars } from './package_inputs';
import { useOnboardingSO } from './use_onboarding_so';
import { cleanupManagedIntegrationsPolicies } from './policy_cleanup_managed_integrations';
import type { PolicyCleanupOps } from './policy_cleanup';

export {
  getRegionFieldName,
  buildStreamVars,
  buildPackageInputs,
  toSOServiceVars,
} from './package_inputs';

export interface UseDeployResult {
  namespace: string;
  setNamespace: (ns: string) => void;
  isDeploying: boolean;
  failedInstances: string[];
  handleDeploy: (instanceIds?: string[]) => Promise<void>;
  isAlreadyDeployed: boolean;
  /** The reconciled instance groups Deploy will create policies for; drives the Federated Identity template set. */
  deployGroups: DeployGroup[];
}

export function useDeploy({ onContinue }: { onContinue: () => void }): UseDeployResult {
  const { services } = useKibana<CoreStart>();
  const { createDeployment, updateDeployment, persistDeploymentId } = useOnboardingSO();
  const {
    servicesStep,
    authenticateAndDeployStep,
    setPendingIacTemplate,
    detectAndReviewStep,
    updateDetectAndReviewStep,
    removeDeployInstances,
    getLatestFailedInstances,
    awsServicesMap: servicesMap,
  } = useOnboardingFlow();
  const { selectedServiceIds, dataFormat } = servicesStep;

  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    { globalRegion: '', serviceVars: {} }
  );

  const [namespace, setNamespace] = useState('default');
  const [isDeploying, setIsDeploying] = useState(false);
  // Seeded from session storage so a partial failure survives unmounting Step 3. Without this,
  // navigating Back and forward again clears the failure locally while serviceStatuses still holds
  // the 'error' chip, which opens the isDone gate on a deploy that never succeeded.
  const [failedInstances, setFailedInstances] = useState<string[]>(
    () => detectAndReviewStep.failedInstances ?? []
  );

  const hasEcfServices = useMemo(
    () =>
      selectedServiceIds.some((id) =>
        servicesMap?.get(id)?.deploymentMethods.some((dm) => dm.method === 'ecf')
      ),
    [selectedServiceIds, servicesMap]
  );

  const deployGroups: DeployGroup[] = useMemo(
    () =>
      buildDeployGroups(
        serviceSettings?.instances ?? [],
        selectedServiceIds,
        servicesMap ?? new Map()
      ),
    [serviceSettings?.instances, selectedServiceIds, servicesMap]
  );

  // The Existing Identity check renders the stack update without touching the connector; the
  // template's details are written only once every integration it was rendered for is deployed,
  // so a launch the user abandoned never marks the identity as upgraded. Written only when the
  // identity AND the integration set match what was launched: enabled inputs live in session
  // storage and can change after the launch without the flow context noticing, and the rendered
  // key only covers the set it was rendered for. On a mismatch the details are left in place; the
  // check on the new set blocks Deploy again if that set needs an update.
  // Best-effort: a failed write is reported once and not retried from this step, which has no
  // Deploy left to press after a successful run. The daily upgrade check then reports the
  // identity as needing an update and the flyout's Update records the key.
  const persistPendingIacTemplate = useCallback(async () => {
    const { connectorId, pendingIacTemplate } = authenticateAndDeployStep;
    if (!connectorId || !pendingIacTemplate || pendingIacTemplate.connectorId !== connectorId) {
      return;
    }
    const deployedIntegrationsKey = JSON.stringify(
      buildIacIntegrations(
        deployGroups.flatMap((group) => group.members),
        serviceSettings?.serviceVars ?? {}
      )
    );
    if (pendingIacTemplate.integrationsKey !== deployedIntegrationsKey) {
      return;
    }
    const {
      iac_key: iacKey,
      iac_blueprint_id: blueprintId,
      iac_blueprint_version: version,
    } = pendingIacTemplate;
    try {
      const { error } = await sendUpdateCloudConnector(connectorId, {
        iac_key: iacKey,
        iac_blueprint_id: blueprintId,
        iac_blueprint_version: version,
      });
      if (error) {
        throw error;
      }
      // One comparing re-check, as the flyout's Update does after its write: with the new key
      // stored it answers `matches` and the server persists `up_to_date`. Without it the identity
      // keeps advertising an upgrade until the daily task runs. Best-effort: a failed re-check is
      // not a failed write, so it must not reach the toast below; the daily task covers it.
      await sendVerifyCloudConnectorIacKey(connectorId, {}).catch(() => undefined);
      setPendingIacTemplate(undefined);
    } catch {
      services.notifications.toasts.addWarning({
        title: i18n.translate(
          'xpack.ingestHub.authenticateAndDeployStep.iacTemplateWriteFailed.title',
          { defaultMessage: 'Template details were not saved on the identity' }
        ),
        text: i18n.translate(
          'xpack.ingestHub.authenticateAndDeployStep.iacTemplateWriteFailed.text',
          {
            defaultMessage:
              "Your integrations were deployed, but Kibana could not record which CloudFormation template this identity uses, so it may be reported as needing an update. You can update it from the identity's details in Fleet.",
          }
        ),
      });
    }
  }, [
    authenticateAndDeployStep,
    deployGroups,
    serviceSettings?.serviceVars,
    services,
    setPendingIacTemplate,
  ]);

  const isAlreadyDeployed = useMemo(() => {
    if (deployGroups.length === 0) return false;
    const policyIdsByInstance = detectAndReviewStep.policyIdsByInstance ?? {};

    // Live-stale: policyIdsByInstance has entries for services no longer in deployGroups
    // (e.g. user deselected from Step 1). Cleanup must run on the next Deploy click.
    const activeInstanceIds = new Set(deployGroups.flatMap((g) => g.instanceIds));
    if (Object.keys(policyIdsByInstance).some((id) => !activeInstanceIds.has(id))) return false;

    // Explicit cleanup staged by removeDeployInstance (Step 4 deselection).
    if (Object.keys(detectAndReviewStep.pendingCleanupPolicyIds ?? {}).length > 0) return false;

    return deployGroups.every((group) =>
      group.members.every(({ instance }) => {
        const status = detectAndReviewStep.serviceStatuses[instance.instanceId];
        return status === 'receiving' || status === 'detecting' || status === 'timeout';
      })
    );
  }, [
    deployGroups,
    detectAndReviewStep.serviceStatuses,
    detectAndReviewStep.policyIdsByInstance,
    detectAndReviewStep.pendingCleanupPolicyIds,
  ]);

  const nonAgentlessServices: AwsServiceMatrixEntry[] = useMemo(
    () =>
      selectedServiceIds
        .map((id) => servicesMap?.get(id))
        .filter(
          (s): s is AwsServiceMatrixEntry =>
            s !== undefined &&
            !s.deploymentMethods.some((dm) => dm.method === 'managed_integration' && dm.preferred)
        ),
    [selectedServiceIds, servicesMap]
  );

  const handleDeploy = useCallback(
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
              ({ instance }) => !(instance.instanceId in detectAndReviewStep.serviceStatuses)
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
          if (!(service.id in detectAndReviewStep.serviceStatuses)) {
            newNonAgentlessStatuses[service.id] = 'instantiating';
          }
        }

        // Services deselected from Step 1 never call removeDeployInstance, so pendingCleanupPolicyIds
        // won't capture them. Detect stale entries by comparing policyIdsByInstance against the
        // reconciled deployGroups (which already filters by selectedServiceIds).
        const activeInstanceIds = new Set(deployGroups.flatMap((g) => g.instanceIds));
        const liveStalePolicyIds: Record<string, string> = {};
        for (const [iid, pid] of Object.entries(detectAndReviewStep.policyIdsByInstance)) {
          if (!activeInstanceIds.has(iid)) liveStalePolicyIds[iid] = pid;
        }
        const effectivePendingCleanup: Record<string, string> = {
          ...liveStalePolicyIds,
          ...(detectAndReviewStep.pendingCleanupPolicyIds ?? {}),
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

        if (hasPendingCleanup) {
          cleanupOps = await cleanupManagedIntegrationsPolicies({
            pendingCleanupPolicyIds: effectivePendingCleanup,
            currentPolicyIdsByInstance: detectAndReviewStep.policyIdsByInstance,
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
            Object.entries(detectAndReviewStep.pendingCleanupPolicyIds ?? {}).filter(
              ([, policyId]) => !succeededIds.has(policyId)
            )
          );
          updateDetectAndReviewStep({ pendingCleanupPolicyIds: remainingPending });
        }

        if (targets.length === 0) {
          setIsDeploying(false);
          // Cleanup-only: no new deploys, but deleted policies must be pruned from the SO record.
          const existingDeploymentId = detectAndReviewStep.onboardingDeploymentId;
          if (
            existingDeploymentId &&
            (cleanupOps.toDelete.length > 0 || cleanupOps.toUpdate.length > 0)
          ) {
            const deletedIds = new Set(cleanupOps.toDelete);
            await updateDeployment(existingDeploymentId, {
              services: selectedServiceIds,
              packagePolicyIds: [
                ...new Set(
                  Object.values(detectAndReviewStep.policyIdsByInstance).filter(
                    (id) => !deletedIds.has(id)
                  )
                ),
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
        const remainingFailed = detectAndReviewStep.failedInstances.filter(
          (id) => !deployedTargets.includes(id)
        );
        setIsDeploying(true);
        updateDetectAndReviewStep({
          isDeploying: true,
          serviceStatuses: retryStatuses,
          failedInstances: remainingFailed,
          deployErrors: {},
        });
      }

      const globalRegion = serviceSettings?.globalRegion ?? '';
      const storedServiceVars = serviceSettings?.serviceVars ?? {};

      const { connectorId } = authenticateAndDeployStep;
      let onboardingDeploymentId = detectAndReviewStep.onboardingDeploymentId;

      if (isInitialDeploy && !onboardingDeploymentId) {
        onboardingDeploymentId =
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
        if (onboardingDeploymentId) {
          // Enter edit mode: add ?deploymentId= to URL so the format selector is locked
          // and any reload identifies this as a resumable deployment.
          persistDeploymentId(onboardingDeploymentId);
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
        policyIdsByInstance,
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
      if (onboardingDeploymentId) {
        await updateDeployment(onboardingDeploymentId, {
          services: selectedServiceIds,
          serviceVars: toSOServiceVars(
            serviceSettings?.serviceVars ?? {},
            servicesMap ?? new Map()
          ) as Record<string, Record<string, unknown>>,
          packagePolicyIds: [
            ...new Set(
              Object.values({
                ...detectAndReviewStep.policyIdsByInstance,
                ...policyIdsByInstance,
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
        policyIdsByInstance,
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
      onContinue,
      updateDetectAndReviewStep,
      removeDeployInstances,
      getLatestFailedInstances,
      detectAndReviewStep.serviceStatuses,
      detectAndReviewStep.failedInstances,
      detectAndReviewStep.onboardingDeploymentId,
      detectAndReviewStep.policyIdsByInstance,
      detectAndReviewStep.pendingCleanupPolicyIds,
      createDeployment,
      updateDeployment,
      persistDeploymentId,
      selectedServiceIds,
      dataFormat,
      servicesMap,
      hasEcfServices,
      persistPendingIacTemplate,
    ]
  );

  return {
    namespace,
    setNamespace,
    isDeploying,
    failedInstances,
    handleDeploy,
    isAlreadyDeployed,
    deployGroups,
  };
}
