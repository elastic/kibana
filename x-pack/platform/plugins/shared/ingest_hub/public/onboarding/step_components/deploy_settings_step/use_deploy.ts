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

/**
 * A deploy group is the unit of one `sendCreateAgentlessPolicy` call.
 *
 * - Bundled originals: one group per package, covering all non-duplicate agentless instances
 *   of that package. This restores the pre-PR behaviour (one agent policy for all selected
 *   services of the same package) and keeps resource usage equivalent to a non-duplicate deploy.
 * - Duplicates: one group per instance, because duplicate instances of the same service would
 *   collide inside `buildPackageInputs` (stream keys map on dataset name, which is shared).
 */
interface DeployGroup {
  /** Package name — used for bundled originals. InstanceId — used for duplicates. */
  groupId: string;
  /** All instanceIds whose status, policyId, and error this call resolves. */
  instanceIds: string[];
  members: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>;
  isDuplicateGroup: boolean;
}

function buildAgentlessPolicyName(group: DeployGroup): string {
  // Date.now() suffix prevents cross-session collisions: Fleet enforces unique agent-policy
  // names space-wide, so a fresh-session re-run would fail without it.
  // Truncate to stay within Fleet's policy name length limit.
  if (group.isDuplicateGroup) {
    const { instance } = group.members[0];
    const safe = instance.instanceId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const name = instance.name.slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${safe}-${name}-${Date.now()}`;
  }
  // Bundled originals — named after the package.
  const pkg = group.groupId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return `${pkg}-${Date.now()}`;
}

interface GroupDeployOutcome {
  policyId?: string;
}

async function deployGroup(
  group: DeployGroup,
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
): Promise<GroupDeployOutcome> {
  // All members share the same packageName — use the first for pkg info.
  const { service: firstService } = group.members[0];
  const pkgInfoResponse = await sendGetPackageInfoByKey(firstService.packageName);
  const pkgInfo = pkgInfoResponse.data?.item;
  const pkgVersion = pkgInfo?.version;
  if (!pkgVersion) {
    throw new Error(`Package ${firstService.packageName} is not installed`);
  }

  const { connectorId, staticKeys } = deploySettingsStep;

  // Build a vars map keyed by service.id for buildPackageInputs.
  // Look up vars by instanceId first; fall back to serviceId for sessions predating instance keying.
  const serviceVarsMap: Record<string, ServiceVars> = {};
  for (const { instance, service } of group.members) {
    serviceVarsMap[service.id] = storedServiceVars[instance.instanceId] ??
      storedServiceVars[instance.serviceId] ?? { trigger: null, vars: {} };
  }

  const services = group.members.map(({ service }) => service);
  const inputs = buildPackageInputs(services, serviceVarsMap, globalRegion);

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
    name: buildAgentlessPolicyName(group),
    namespace,
    package: { name: firstService.packageName, version: pkgVersion },
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
  results: PromiseSettledResult<GroupDeployOutcome>[],
  groups: DeployGroup[]
): {
  policyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  errorsByInstance: Record<string, string>;
} {
  const policyIdsByInstance: Record<string, string> = {};
  const failedInstances: string[] = [];
  const errorsByInstance: Record<string, string> = {};

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const result = results[i];
    if (result.status === 'fulfilled') {
      // All instances in the group share the one policy — write policyId for each.
      if (result.value.policyId) {
        for (const instanceId of group.instanceIds) {
          policyIdsByInstance[instanceId] = result.value.policyId;
        }
      }
    } else {
      // A bundled call failure surfaces as an error on every instance in the group.
      const errorMsg = extractErrorMessage(result.reason);
      for (const instanceId of group.instanceIds) {
        failedInstances.push(instanceId);
        errorsByInstance[instanceId] = errorMsg;
      }
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

  // Build deploy groups from session storage — fall back to one base instance per selected
  // service id when instances haven't been written yet (e.g. user skipped step 2).
  //
  // Grouping strategy:
  //   - Originals (isDuplicate: false): one group per package, bundled into a single
  //     sendCreateAgentlessPolicy call. This matches the pre-PR behaviour (one agent policy
  //     for all selected services of the same package).
  //   - Duplicates (isDuplicate: true): one group per instance, because duplicate instances
  //     of the same service share the same stream key inside buildPackageInputs and would
  //     silently overwrite each other if bundled.
  const deployGroups: DeployGroup[] = useMemo(() => {
    const stored = serviceSettings?.instances;
    const instances: ServiceInstance[] = stored?.length
      ? stored
      : selectedServiceIds.map((id) => ({
          instanceId: id,
          serviceId: id,
          name: AWS_SERVICES_MAP.get(id)?.name ?? id,
          isDuplicate: false,
        }));

    // Separate agentless originals from duplicates; drop non-agentless entirely.
    const originals: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }> = [];
    const duplicates: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }> = [];

    for (const inst of instances) {
      const service = AWS_SERVICES_MAP.get(inst.serviceId);
      if (!service) continue;
      // TODO(follow-up): non-agentless duplicates are silently dropped here.
      // ECF and agent-based duplicate deploy support are tracked in separate follow-up issues.
      if (!service.deliveryMethods.some((dm) => dm.method === 'agentless' && dm.preferred)) {
        continue;
      }
      if (inst.isDuplicate) {
        duplicates.push({ instance: inst, service });
      } else {
        originals.push({ instance: inst, service });
      }
    }

    // Group originals by package name.
    const bundledByPackage = new Map<
      string,
      Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>
    >();
    for (const member of originals) {
      const pkg = member.service.packageName;
      if (!bundledByPackage.has(pkg)) bundledByPackage.set(pkg, []);
      bundledByPackage.get(pkg)!.push(member);
    }

    const groups: DeployGroup[] = [];
    for (const [pkg, members] of bundledByPackage) {
      groups.push({
        groupId: pkg,
        instanceIds: members.map(({ instance }) => instance.instanceId),
        members,
        isDuplicateGroup: false,
      });
    }
    for (const member of duplicates) {
      groups.push({
        groupId: member.instance.instanceId,
        instanceIds: [member.instance.instanceId],
        members: [member],
        isDuplicateGroup: true,
      });
    }

    return groups;
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

      let groupsToDeploy: DeployGroup[];

      if (isInitialDeploy) {
        // For bundled groups, restrict members to those not already tracked — an already-running
        // original must not be re-included in a new policy when a sibling is added later.
        // Duplicate groups are always single-member so this only affects originals in practice.
        groupsToDeploy = deployGroups
          .map((group) => {
            if (group.isDuplicateGroup) return group;
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
            deploySettingsStep,
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
