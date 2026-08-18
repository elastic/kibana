/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { ServiceChipState } from '../../onboarding_flow_context';
import { SERVICE_SETTINGS_SESSION_KEY } from '../service_settings_step/use_service_settings';
import type { ServiceVars, ServiceInstance } from '../service_settings_step/use_service_settings';
import {
  buildDeployGroups,
  buildInstanceStatuses,
  collectDeployResults,
  deployGroup,
} from './deploy_groups';
import type { DeployGroup } from './deploy_groups';

export { getRegionFieldName, buildStreamVars, buildPackageInputs } from './package_inputs';

interface ServiceSettingsPersistedState {
  globalRegion: string;
  serviceVars: Record<string, ServiceVars>;
  instances?: ServiceInstance[];
}

export interface UseDeployResult {
  namespace: string;
  setNamespace: (ns: string) => void;
  isDeploying: boolean;
  failedInstances: string[];
  handleDeploy: (instanceIds?: string[]) => void;
}

export function useDeploy({ onContinue }: { onContinue: () => void }): UseDeployResult {
  const {
    servicesStep,
    authenticateAndDeployStep,
    deployAndDetectStep,
    updateDeployAndDetectStep,
    getLatestFailedInstances,
    registerDeployHandler,
    awsServicesMap: servicesMap,
  } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    { globalRegion: '', serviceVars: {} }
  );

  const [namespace, setNamespace] = useState('default');
  const [isDeploying, setIsDeploying] = useState(false);
  const [failedInstances, setFailedInstances] = useState<string[]>([]);

  const deployGroups: DeployGroup[] = useMemo(
    () =>
      buildDeployGroups(
        serviceSettings?.instances ?? [],
        selectedServiceIds,
        servicesMap ?? new Map()
      ),
    [serviceSettings?.instances, selectedServiceIds, servicesMap]
  );

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

      if (isInitialDeploy) {
        // Restrict each group to members not already tracked — an already-deployed instance
        // must not get a second policy on a subsequent Deploy click (e.g. after navigating back).
        groupsToDeploy = deployGroups
          .map((group) => {
            const untrackedMembers = group.members.filter(
              ({ instance }) => !(instance.instanceId in deployAndDetectStep.serviceStatuses)
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

        // Non-agentless services are shown as gray chips but never deployed.
        const newNonAgentlessStatuses: Record<string, ServiceChipState> = {};
        for (const service of nonAgentlessServices) {
          if (!(service.id in deployAndDetectStep.serviceStatuses)) {
            newNonAgentlessStatuses[service.id] = 'instantiating';
          }
        }

        if (targets.length === 0 && Object.keys(newNonAgentlessStatuses).length === 0) {
          onContinue();
          return;
        }

        const initialStatuses = buildInstanceStatuses(targets, []);
        if (targets.length > 0) setIsDeploying(true);
        updateDeployAndDetectStep({
          isDeploying: targets.length > 0,
          serviceStatuses: { ...initialStatuses, ...newNonAgentlessStatuses },
        });
        onContinue();

        if (targets.length === 0) return;
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
        const remainingFailed = deployAndDetectStep.failedInstances.filter(
          (id) => !deployedTargets.includes(id)
        );
        setIsDeploying(true);
        updateDeployAndDetectStep({
          isDeploying: true,
          serviceStatuses: retryStatuses,
          failedInstances: remainingFailed,
          deployErrors: {},
        });
      }

      const globalRegion = serviceSettings?.globalRegion ?? '';
      const storedServiceVars = serviceSettings?.serviceVars ?? {};

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
      const newServiceStatuses = buildInstanceStatuses(deployedTargets, newFailed, 'receiving');

      // Merge with instances that failed in a prior run but weren't retried in this one.
      const deployedSet = new Set(deployedTargets);
      const previouslyFailed = getLatestFailedInstances().filter((id) => !deployedSet.has(id));
      const mergedFailed = [...previouslyFailed, ...newFailed];

      setIsDeploying(false);
      setFailedInstances(mergedFailed);
      updateDeployAndDetectStep({
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
      updateDeployAndDetectStep,
      getLatestFailedInstances,
      deployAndDetectStep.serviceStatuses,
      deployAndDetectStep.failedInstances,
    ]
  );

  useEffect(() => {
    registerDeployHandler(handleDeploy);
  }, [handleDeploy, registerDeployHandler]);

  return { namespace, setNamespace, isDeploying, failedInstances, handleDeploy };
}
