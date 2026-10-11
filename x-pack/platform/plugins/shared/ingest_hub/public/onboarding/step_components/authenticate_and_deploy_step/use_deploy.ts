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
import { SERVICE_SETTINGS_SESSION_KEY } from '../service_settings_step/use_service_settings';
import type { ServiceSettingsPersistedState } from '../service_settings_step/use_service_settings';
import { buildDeployGroups } from './deploy_groups';
import { DEFAULT_NAMESPACE } from './deploy_group_helpers';
import type { DeployGroup } from './deploy_groups';
import { buildIacIntegrations } from './package_inputs';
import { useOnboardingSO } from './use_onboarding_so';
import { useMiDeploy } from './use_mi_deploy';
import {
  buildLiveStalePolicyIds,
  buildEffectivePendingCleanup,
  pickSecretSourcePolicyId,
} from './cleanup_reconciliation';
import { fetchAgentlessSecretRefs, useExistingSecretRefs } from './secret_refs';

const STATIC_KEY_FIELDS = ['access_key_id', 'secret_access_key'] as const;
type StaticKeyField = (typeof STATIC_KEY_FIELDS)[number];

export {
  getRegionFieldName,
  buildStreamVars,
  buildPackageInputs,
  toSOServiceVars,
} from './package_inputs';

export interface UseDeployResult {
  isDeploying: boolean;
  failedInstances: string[];
  handleDeploy: (instanceIds?: string[]) => Promise<{ cleanupFailed: boolean }>;
  isAlreadyDeployed: boolean;
  /** The reconciled instance groups Deploy will create policies for; drives the Federated Identity template set. */
  deployGroups: DeployGroup[];
  /**
   * True when there is pending cleanup (removed services) but no new instances to deploy.
   * Cleanup uses only Kibana/Fleet auth — AWS credentials are not required, so the Deploy
   * button should be enabled regardless of isDeployReady.
   */
  isCleanupOnly: boolean;
  /** Credential fields already stored as secrets on the deployed policies; kept unless replaced. */
  storedSecretFields: StaticKeyField[];
  /** True until the stored-secret lookup of the deployed policies has settled. */
  isStoredSecretsLoading: boolean;
}

export function useDeploy({ onContinue }: { onContinue: () => void }): UseDeployResult {
  const { services } = useKibana<CoreStart>();
  const { createDeployment, updateDeployment, persistDeploymentId } = useOnboardingSO();
  const {
    servicesStep,
    authenticateAndDeployStep,
    setPendingIacTemplate,
    clearStagedStaticKeys,
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
        servicesMap ?? new Map(),
        serviceSettings?.serviceVars ?? {}
      ),
    [serviceSettings?.instances, serviceSettings?.serviceVars, selectedServiceIds, servicesMap]
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

  // The credentials of a resumed or revisited session are never in memory, but the deployed
  // policies still hold them as secrets; the form offers to keep them. Read from a policy a
  // pending cleanup keeps, since deleting a policy deletes its secrets. No lookup for policies
  // that authenticate through an identity: they have no keys to keep.
  const secretSourcePolicyId = useMemo(() => {
    const policyIdsByInstance = detectAndReviewStep.policyIdsByInstance ?? {};
    const activeInstanceIds = new Set(deployGroups.flatMap((g) => g.instanceIds));
    return pickSecretSourcePolicyId(
      policyIdsByInstance,
      buildEffectivePendingCleanup(
        buildLiveStalePolicyIds(policyIdsByInstance, activeInstanceIds),
        detectAndReviewStep.pendingCleanupPolicyIds
      )
    );
  }, [
    deployGroups,
    detectAndReviewStep.policyIdsByInstance,
    detectAndReviewStep.pendingCleanupPolicyIds,
  ]);
  const { existingSecretRefs, isLoading: isStoredSecretsLoading } = useExistingSecretRefs(
    authenticateAndDeployStep.connectorId ? undefined : secretSourcePolicyId,
    fetchAgentlessSecretRefs
  );
  const storedSecretFields = useMemo(
    () =>
      authenticateAndDeployStep.connectorId
        ? []
        : STATIC_KEY_FIELDS.filter((field) => existingSecretRefs.has(field)),
    [authenticateAndDeployStep.connectorId, existingSecretRefs]
  );
  const hasStoredCredentials = storedSecretFields.length === STATIC_KEY_FIELDS.length;

  const isAlreadyDeployed = useMemo(() => {
    if (deployGroups.length === 0) return false;
    const activeInstanceIds = new Set(deployGroups.flatMap((g) => g.instanceIds));
    // Live-stale: policyIdsByInstance has entries for services no longer in deployGroups.
    const liveStalePolicyIds = buildLiveStalePolicyIds(
      detectAndReviewStep.policyIdsByInstance ?? {},
      activeInstanceIds
    );
    if (Object.keys(liveStalePolicyIds).length > 0) return false;
    // Explicit cleanup staged by removeDeployInstance (Step 4 deselection).
    if (Object.keys(detectAndReviewStep.pendingCleanupPolicyIds ?? {}).length > 0) return false;
    return deployGroups.every((group) =>
      group.members.every(({ instance }) => {
        const status = detectAndReviewStep.serviceStatuses[instance.instanceId];
        // A resumed session restores the policy ids but not the detection statuses: a mapped
        // instance without a status was deployed in an earlier session.
        if (status === undefined) {
          return instance.instanceId in (detectAndReviewStep.policyIdsByInstance ?? {});
        }
        return status === 'receiving' || status === 'detecting' || status === 'timeout';
      })
    );
  }, [
    deployGroups,
    detectAndReviewStep.serviceStatuses,
    detectAndReviewStep.policyIdsByInstance,
    detectAndReviewStep.pendingCleanupPolicyIds,
  ]);

  const isCleanupOnly = useMemo(() => {
    // Failed instances always need a retry deploy — credentials are required. Treat them as
    // new untracked targets so the credential gate stays on even when pending cleanup exists.
    if (failedInstances.length > 0) return false;
    // A dirty-update PUT is a full replace: without credentials in memory it only keeps the AWS
    // keys by sending back the stored secret refs. Require them to be stored (and not swapped for
    // an identity); otherwise the user has to re-enter credentials.
    if (
      detectAndReviewStep.isDirty &&
      (!hasStoredCredentials || authenticateAndDeployStep.authMethod === 'identity_federation')
    ) {
      return false;
    }
    const activeInstanceIds = new Set(deployGroups.flatMap((g) => g.instanceIds));
    const liveStalePolicyIds = buildLiveStalePolicyIds(
      detectAndReviewStep.policyIdsByInstance ?? {},
      activeInstanceIds
    );
    const effectivePending = buildEffectivePendingCleanup(
      liveStalePolicyIds,
      detectAndReviewStep.pendingCleanupPolicyIds
    );
    if (Object.keys(effectivePending).length === 0) return false;
    const policyIdsByInstance = detectAndReviewStep.policyIdsByInstance ?? {};
    return !deployGroups.some((group) =>
      group.members.some(
        ({ instance }) =>
          !(instance.instanceId in detectAndReviewStep.serviceStatuses) &&
          !(instance.instanceId in policyIdsByInstance)
      )
    );
  }, [
    failedInstances,
    deployGroups,
    hasStoredCredentials,
    authenticateAndDeployStep.authMethod,
    detectAndReviewStep.isDirty,
    detectAndReviewStep.policyIdsByInstance,
    detectAndReviewStep.serviceStatuses,
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

  const handleDeploy = useMiDeploy({
    deployGroups,
    nonAgentlessServices,
    serviceSettings,
    authenticateAndDeployStep,
    namespace: DEFAULT_NAMESPACE,
    selectedServiceIds,
    dataFormat,
    servicesMap,
    hasEcfServices,
    onContinue,
    updateDetectAndReviewStep,
    removeDeployInstances,
    getLatestFailedInstances,
    persistPendingIacTemplate,
    clearStagedStaticKeys,
    setIsDeploying,
    setFailedInstances,
    createDeployment,
    updateDeployment,
    persistDeploymentId,
    serviceStatuses: detectAndReviewStep.serviceStatuses,
    failedInstances: detectAndReviewStep.failedInstances,
    onboardingDeploymentId: detectAndReviewStep.onboardingDeploymentId,
    policyIdsByInstance: detectAndReviewStep.policyIdsByInstance,
    pendingCleanupPolicyIds: detectAndReviewStep.pendingCleanupPolicyIds,
    isDirty: detectAndReviewStep.isDirty ?? false,
    isAuthDirty: detectAndReviewStep.isAuthDirty ?? false,
  });

  return {
    isDeploying,
    failedInstances,
    handleDeploy,
    isAlreadyDeployed,
    deployGroups,
    isCleanupOnly,
    storedSecretFields,
    isStoredSecretsLoading,
  };
}
