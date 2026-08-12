/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import { sendCreateAgentlessPolicy, sendGetPackageInfoByKey } from '@kbn/fleet-plugin/public';

import { AWS_SERVICES_MAP } from '../../aws_service_matrix';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { DeploySettingsStepState, ServiceChipState } from '../../onboarding_flow_context';
import { FIELD_CONFIG } from '../service_settings_step/field_config';
import { SERVICE_SETTINGS_SESSION_KEY } from '../service_settings_step/use_service_settings';
import type { ServiceVars, ServiceInstance } from '../service_settings_step/use_service_settings';

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

interface PackageInputEntry {
  enabled: boolean;
  vars?: Record<string, string | boolean | string[]>;
  streams: Record<string, { enabled: boolean; vars: Record<string, string | boolean | string[]> }>;
}

const BOOLEAN_VAR_NAMES = new Set([
  'preserve_original_event',
  'collect_s3_logs',
  'preserve_duplicate_custom_fields',
  'collect_esm_metrics',
  'leaderelection',
]);

export function getRegionFieldName(
  service: AwsServiceMatrixEntry,
  activeTransport: string | null
): string {
  const rc = service.requiredConfig ?? [];
  if (activeTransport === 'aws-s3' && rc.includes('region')) return 'region';
  if (activeTransport === 'aws-cloudwatch' && rc.includes('region_name')) return 'region_name';
  if (rc.includes('aws_region')) return 'aws_region';
  return '';
}

export function buildStreamVars(
  service: AwsServiceMatrixEntry,
  serviceVars: ServiceVars,
  globalRegion: string
): Record<string, string | boolean | string[]> {
  const result: Record<string, string | boolean | string[]> = {};

  for (const [key, value] of Object.entries(serviceVars.vars)) {
    if (BOOLEAN_VAR_NAMES.has(key)) {
      result[key] = value === 'true';
    } else if (FIELD_CONFIG[key]?.multi) {
      const parts = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) result[key] = parts;
    } else {
      result[key] = value;
    }
  }

  // Backfill singular region field from globalRegion when not explicitly set
  const regionField = getRegionFieldName(service, serviceVars.trigger);
  if (regionField && !result[regionField] && globalRegion) {
    result[regionField] = globalRegion;
  }

  return result;
}

export function buildPackageInputs(
  services: AwsServiceMatrixEntry[],
  storedServiceVars: Record<string, ServiceVars>,
  globalRegion: string
): Record<string, PackageInputEntry> {
  const inputs: Record<string, PackageInputEntry> = {};

  for (const service of services) {
    const serviceVars: ServiceVars = storedServiceVars[service.id] ?? { trigger: null, vars: {} };
    const defaultInput = service.inputs?.includes('aws-s3') ? 'aws-s3' : service.inputs?.[0] ?? '';
    const inputType = serviceVars.trigger ?? defaultInput;
    if (!inputType) continue;

    const inputKey = service.policyTemplate ? `${service.policyTemplate}-${inputType}` : inputType;
    const streamKey = `${service.packageName}.${service.dataStream ?? service.id}`;
    const streamVars = buildStreamVars(service, serviceVars, globalRegion);

    if (!inputs[inputKey]) {
      inputs[inputKey] = { enabled: true, streams: {} };
    }

    inputs[inputKey].streams[streamKey] = { enabled: true, vars: streamVars };
  }

  return inputs;
}

function buildPackageVars(
  globalRegion: string,
  staticKeys: DeploySettingsStepState['staticKeys'],
  pkgVarNames: Set<string>
): Record<string, string> | undefined {
  const vars: Record<string, string> = {};
  if (globalRegion && pkgVarNames.has('default_region')) vars.default_region = globalRegion;
  if (staticKeys?.access_key_id && staticKeys?.secret_access_key) {
    if (pkgVarNames.has('access_key_id')) vars.access_key_id = staticKeys.access_key_id;
    if (pkgVarNames.has('secret_access_key')) vars.secret_access_key = staticKeys.secret_access_key;
  }
  return Object.keys(vars).length > 0 ? vars : undefined;
}

function getPackageVarNames(pkgInfo: { vars?: Array<{ name: string }> }): Set<string> {
  return new Set((pkgInfo.vars ?? []).map((v) => v.name));
}

function buildAgentlessPolicyName(instanceName: string, instanceId: string): string {
  // instanceId makes the name unique within a single deploy (no concurrent collision).
  // Date.now() suffix prevents cross-session collisions: Fleet enforces unique agent-policy
  // names, so re-running onboarding in a fresh session would fail without it.
  // Truncate segments to stay within Fleet's policy name length limit.
  const safe = instanceId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const name = instanceName.slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safe}-${name}-${Date.now()}`;
}

interface InstanceDeployOutcome {
  policyId?: string;
}

async function deployInstance(
  instance: ServiceInstance,
  service: AwsServiceMatrixEntry,
  {
    namespace,
    globalRegion,
    storedServiceVars,
    deploySettingsStep,
  }: {
    namespace: string;
    globalRegion: string;
    storedServiceVars: Record<string, ServiceVars>;
    deploySettingsStep: DeploySettingsStepState;
  }
): Promise<InstanceDeployOutcome> {
  const pkgInfoResponse = await sendGetPackageInfoByKey(service.packageName);
  const pkgInfo = pkgInfoResponse.data?.item;
  const pkgVersion = pkgInfo?.version;
  if (!pkgVersion) {
    throw new Error(`Package ${service.packageName} is not installed`);
  }

  const { connectorId, staticKeys } = deploySettingsStep;

  // Look up vars by instanceId first; fall back to serviceId for sessions predating instance keying.
  const instanceVars: ServiceVars = storedServiceVars[instance.instanceId] ??
    storedServiceVars[instance.serviceId] ?? { trigger: null, vars: {} };

  const inputs = buildPackageInputs([service], { [service.id]: instanceVars }, globalRegion);

  // Explicitly disable all package inputs not in our selection to avoid Fleet defaulting
  // enabled inputs that would cause "not allowed for agentless" errors.
  const pkgTemplates: Array<{ name?: string; type?: string; inputs?: Array<{ type: string }> }> =
    (pkgInfo as any).policy_templates ?? [];
  for (const template of pkgTemplates) {
    const templateInputs = template.inputs ?? (template.type ? [{ type: template.type }] : []);
    for (const input of templateInputs) {
      const key = template.name ? `${template.name}-${input.type}` : input.type;
      if (!inputs[key]) {
        inputs[key] = { enabled: false, streams: {} };
      }
    }
  }

  const pkgVarNames = getPackageVarNames(pkgInfo);
  const vars = buildPackageVars(globalRegion, staticKeys, pkgVarNames);

  const response = await sendCreateAgentlessPolicy({
    name: buildAgentlessPolicyName(instance.name, instance.instanceId),
    namespace,
    package: { name: service.packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    inputs,
    ...(connectorId ? { cloud_connector: { enabled: true, cloud_connector_id: connectorId } } : {}),
  });

  return { policyId: (response as any)?.data?.item?.policy_ids?.[0] };
}

function extractErrorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason !== null && typeof reason === 'object' && 'message' in reason) {
    return String((reason as { message: unknown }).message);
  }
  return String(reason);
}

export function collectDeployResults(
  results: PromiseSettledResult<InstanceDeployOutcome>[],
  targets: string[]
): {
  policyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  errorsByInstance: Record<string, string>;
} {
  const policyIdsByInstance: Record<string, string> = {};
  const failedInstances: string[] = [];
  const errorsByInstance: Record<string, string> = {};

  for (let i = 0; i < targets.length; i++) {
    const instanceId = targets[i];
    const result = results[i];
    if (result.status === 'fulfilled') {
      if (result.value.policyId) policyIdsByInstance[instanceId] = result.value.policyId;
    } else {
      failedInstances.push(instanceId);
      errorsByInstance[instanceId] = extractErrorMessage(result.reason);
    }
  }

  return { policyIdsByInstance, failedInstances, errorsByInstance };
}

export function buildInstanceStatuses(
  targets: string[],
  failedInstances: string[],
  succeededState: ServiceChipState = 'instantiating'
): Record<string, ServiceChipState> {
  const statuses: Record<string, ServiceChipState> = {};
  const failedSet = new Set(failedInstances);

  for (const instanceId of targets) {
    statuses[instanceId] = failedSet.has(instanceId) ? 'error' : succeededState;
  }

  return statuses;
}

export function useDeploy({ onContinue }: { onContinue: () => void }): UseDeployResult {
  const {
    servicesStep,
    deploySettingsStep,
    deployAndDetectStep,
    updateDeployAndDetectStep,
    getLatestFailedInstances,
    registerDeployHandler,
  } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    { globalRegion: '', serviceVars: {} }
  );

  const [namespace, setNamespace] = useState('default');
  const [isDeploying, setIsDeploying] = useState(false);
  const [failedInstances, setFailedInstances] = useState<string[]>([]);

  // Derive agentless instances from session storage — fall back to one base instance per selected
  // service id when instances haven't been written yet (e.g. user skipped step 2).
  const agentlessInstances: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }> =
    useMemo(() => {
      const stored = serviceSettings?.instances;
      const instances: ServiceInstance[] = stored?.length
        ? stored
        : selectedServiceIds.map((id) => ({
            instanceId: id,
            serviceId: id,
            name: AWS_SERVICES_MAP.get(id)?.name ?? id,
            isDuplicate: false,
          }));

      return instances.flatMap((inst) => {
        const service = AWS_SERVICES_MAP.get(inst.serviceId);
        if (!service) return [];
        // TODO(follow-up): non-agentless duplicates are silently dropped here.
        // ECF duplicate support is being decided (elastic/ingest-dev#9037);
        // agent-based duplicate support is tracked in elastic/ingest-dev#9079.
        if (!service.deliveryMethods.some((dm) => dm.method === 'agentless' && dm.preferred)) {
          return [];
        }
        return [{ instance: inst, service }];
      });
    }, [serviceSettings?.instances, selectedServiceIds]);

  const nonAgentlessServices: AwsServiceMatrixEntry[] = useMemo(
    () =>
      selectedServiceIds
        .map((id) => AWS_SERVICES_MAP.get(id))
        .filter(
          (s): s is AwsServiceMatrixEntry =>
            s !== undefined &&
            !s.deliveryMethods.some((dm) => dm.method === 'agentless' && dm.preferred)
        ),
    [selectedServiceIds]
  );

  const handleDeploy = useCallback(
    async (instanceIds?: string[]) => {
      const isInitialDeploy = instanceIds === undefined;

      let targets: string[];
      let instancesToDeploy: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>;

      if (isInitialDeploy) {
        instancesToDeploy = agentlessInstances.filter(
          ({ instance }) => !(instance.instanceId in deployAndDetectStep.serviceStatuses)
        );
        targets = instancesToDeploy.map(({ instance }) => instance.instanceId);

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
        targets = instanceIds;
        instancesToDeploy = agentlessInstances.filter(({ instance }) =>
          targets.includes(instance.instanceId)
        );
        const retryStatuses = buildInstanceStatuses(targets, []);
        const remainingFailed = deployAndDetectStep.failedInstances.filter(
          (id) => !targets.includes(id)
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

      const results = await Promise.allSettled(
        instancesToDeploy.map(({ instance, service }) =>
          deployInstance(instance, service, {
            namespace,
            globalRegion,
            storedServiceVars,
            deploySettingsStep,
          })
        )
      );

      // Derive targets from instancesToDeploy so results[i] and deployedTargets[i]
      // are guaranteed to be in the same order (Promise.allSettled preserves it).
      // Using the caller-supplied `targets` for the retry branch would be unsafe
      // if the caller order ever differs from agentlessInstances order.
      const deployedTargets = instancesToDeploy.map(({ instance }) => instance.instanceId);
      const {
        policyIdsByInstance,
        failedInstances: newFailed,
        errorsByInstance,
      } = collectDeployResults(results, deployedTargets);
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
      agentlessInstances,
      nonAgentlessServices,
      serviceSettings,
      deploySettingsStep,
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
