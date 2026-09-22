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
import type { DeployGroup } from './deploy_groups';

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
    getLatestFailedInstances,
    awsServicesMap: servicesMap,
    agentBasedDeployment,
    setAgentBasedDeployment,
  } = useOnboardingFlow();

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

  // Deploy is "already done" when every target instance has a persisted package policy id.
  // This covers both paths durably:
  //   - New policy: agentPolicyId is set in session storage AND policyIdsByInstance is populated.
  //   - Existing policy: agentPolicyId is never set, but policyIdsByInstance is populated after
  //     a successful deploy — this prevents re-deploying on Back+Next in existing mode.
  const isAlreadyDeployed = useMemo(() => {
    if (targets.length === 0) return false;
    const policyIdsByInstance = detectAndReviewStep.policyIdsByInstance ?? {};
    return targets.every((group) =>
      group.instanceIds.every((instanceId) => !!policyIdsByInstance[instanceId])
    );
  }, [targets, detectAndReviewStep.policyIdsByInstance]);

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

      if (targetsToDeploy.length === 0) return { failed: false };

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
      authenticateAndDeployStep,
      agentBasedDeployment,
      setAgentBasedDeployment,
      detectAndReviewStep,
      updateDetectAndReviewStep,
      getLatestFailedInstances,
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
