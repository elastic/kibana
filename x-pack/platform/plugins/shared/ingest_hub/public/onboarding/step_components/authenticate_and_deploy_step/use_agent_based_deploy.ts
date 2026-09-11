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
import type { AgentBasedTarget } from './agent_based_deploy';
import type { AgentCredentialVars } from './package_inputs';

export interface UseAgentBasedDeployResult {
  targets: AgentBasedTarget[];
  isDeploying: boolean;
  failedInstances: string[];
  /** True when a successful deploy result already exists in persisted state. */
  isAlreadyDeployed: boolean;
  /** Trigger a deploy (or retry). Defaults to all targets; pass specific instanceIds for retry. */
  handleDeploy: (instanceIds?: string[]) => void;
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

  const targets: AgentBasedTarget[] = useMemo(
    () =>
      buildAgentBasedTargets(
        serviceSettings?.instances ?? [],
        selectedServiceIds,
        servicesMap ?? new Map()
      ),
    [serviceSettings?.instances, selectedServiceIds, servicesMap]
  );

  // Deploy is "already done" when the agent policy id is persisted (created in a previous session
  // or a previous deploy attempt in this session) AND every target has a status that passed the
  // deploy gate (detecting/receiving/timeout = success, error = failed).
  const isAlreadyDeployed = useMemo(() => {
    if (!agentBasedDeployment.agentPolicyId) return false;
    if (targets.length === 0) return false;
    return targets.every(({ instance }) => {
      const status = detectAndReviewStep.serviceStatuses[instance.instanceId];
      return status === 'receiving' || status === 'detecting' || status === 'timeout';
    });
  }, [agentBasedDeployment.agentPolicyId, targets, detectAndReviewStep.serviceStatuses]);

  const handleDeploy = useCallback(
    async (instanceIds?: string[]) => {
      const isRetry = instanceIds !== undefined && instanceIds.length > 0;
      const targetsToDeploy = isRetry
        ? targets.filter((t) => instanceIds.includes(t.instance.instanceId))
        : targets;

      if (targetsToDeploy.length === 0) return;

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

        if (agentHostsMode === 'existing' || (isRetry && agentPolicyId)) {
          // Existing-policy path:
          // - For retries when agentPolicyId is already set (new-policy mode), we target the
          //   existing policy to avoid creating a second one (double-creation guard).
          // - For existing-policy mode, selectedAgentPolicyIds carries the user's selection.
          const targetPolicyIds =
            isRetry && agentPolicyId ? [agentPolicyId] : selectedAgentPolicyIds ?? [];

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
            const agentPolicyName = await buildAgentPolicyName();
            const result = await deployNewAgentPolicy(targetsToDeploy, {
              ...baseOpts,
              agentPolicyName,
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
            failed = targetsToDeploy.map((t) => t.instance.instanceId);
            errorsByInstance = Object.fromEntries(failed.map((id) => [id, msg]));
          }
        }

        const allTargetIds = targetsToDeploy.map((t) => t.instance.instanceId);
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
      } catch (err) {
        // Unexpected error — mark all as failed.
        const msg = extractErrorMessage(err);
        const allIds = targetsToDeploy.map((t) => t.instance.instanceId);
        const statuses = buildAgentBasedInstanceStatuses(targetsToDeploy, allIds);
        setFailedInstances(allIds);
        updateDetectAndReviewStep({
          isDeploying: false,
          serviceStatuses: statuses,
          failedInstances: allIds,
          deployErrors: Object.fromEntries(allIds.map((id) => [id, msg])),
        });
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
