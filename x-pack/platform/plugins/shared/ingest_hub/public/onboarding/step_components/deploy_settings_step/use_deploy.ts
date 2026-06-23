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
import type { ConnectStepState, DeployPackageResult } from '../../onboarding_flow_context';
import type { ServiceVars } from '../service_settings_step/use_service_settings';

const SERVICE_SETTINGS_SESSION_KEY = 'onboarding.aws.serviceSettingsStep';

interface ServiceSettingsPersistedState {
  globalRegion: string;
  serviceVars: Record<string, ServiceVars>;
}

export interface UseDeployResult {
  namespace: string;
  setNamespace: (ns: string) => void;
  isDeploying: boolean;
  packageStatuses: Record<string, DeployPackageResult>;
  failedPackages: string[];
  handleDeploy: (packageNames?: string[]) => void;
}

interface PackageInputEntry {
  enabled: boolean;
  vars?: Record<string, string | boolean>;
  streams: Record<string, { enabled: boolean; vars: Record<string, string | boolean> }>;
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
): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (const [key, value] of Object.entries(serviceVars.vars)) {
    result[key] = BOOLEAN_VAR_NAMES.has(key) ? value === 'true' : value;
  }

  const regionField = getRegionFieldName(service, serviceVars.trigger);
  if (regionField && !result[regionField] && globalRegion) {
    result[regionField] = globalRegion;
  }

  if ((service.requiredConfig ?? []).includes('regions') && !result.regions && globalRegion) {
    result.regions = globalRegion;
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
    const inputType = serviceVars.trigger ?? service.inputs?.[0] ?? '';
    if (!inputType) continue;

    const inputKey = service.policyTemplate ? `${service.policyTemplate}-${inputType}` : inputType;
    const streamKey = `${service.packageName}.${service.id}`;
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
  staticKeys: ConnectStepState['staticKeys']
): Record<string, string> | undefined {
  const vars: Record<string, string> = {};
  if (globalRegion) vars.default_region = globalRegion;
  if (staticKeys?.access_key_id && staticKeys?.secret_access_key) {
    vars.access_key_id = staticKeys.access_key_id;
    vars.secret_access_key = staticKeys.secret_access_key;
  }
  return Object.keys(vars).length > 0 ? vars : undefined;
}

async function deployPackage(
  packageName: string,
  services: AwsServiceMatrixEntry[],
  {
    namespace,
    globalRegion,
    storedServiceVars,
    connectStep,
  }: {
    namespace: string;
    globalRegion: string;
    storedServiceVars: Record<string, ServiceVars>;
    connectStep: ConnectStepState;
  }
): Promise<void> {
  const pkgInfoResponse = await sendGetPackageInfoByKey(packageName);
  const pkgVersion = pkgInfoResponse.data?.item?.version;
  if (!pkgVersion) {
    throw new Error(`Package ${packageName} is not installed`);
  }

  const { connectorId, staticKeys } = connectStep;
  const inputs = buildPackageInputs(services, storedServiceVars, globalRegion);
  const vars = buildPackageVars(globalRegion, staticKeys);

  await sendCreateAgentlessPolicy({
    name: `aws-onboarding-${packageName}`,
    namespace,
    package: { name: packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    inputs,
    ...(connectorId ? { cloud_connector: { enabled: true, cloud_connector_id: connectorId } } : {}),
  });
}

function extractErrorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason !== null && typeof reason === 'object' && 'message' in reason) {
    return String((reason as { message: unknown }).message);
  }
  return String(reason);
}

export function collectDeployResults(
  results: PromiseSettledResult<void>[],
  targets: string[]
): { nextStatuses: Record<string, DeployPackageResult>; anyFailed: boolean } {
  const nextStatuses: Record<string, DeployPackageResult> = {};
  let anyFailed = false;

  for (let i = 0; i < targets.length; i++) {
    const pkg = targets[i];
    const result = results[i];
    if (result.status === 'fulfilled') {
      nextStatuses[pkg] = { status: 'success' };
    } else {
      anyFailed = true;
      nextStatuses[pkg] = {
        status: 'error',
        errorMessage: extractErrorMessage(result.reason),
      };
    }
  }

  return { nextStatuses, anyFailed };
}

export function useDeploy({ onContinue }: { onContinue: () => void }): UseDeployResult {
  const { servicesStep, connectStep, updateDeployStep, registerDeployHandler } =
    useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    { globalRegion: '', serviceVars: {} }
  );

  const [namespace, setNamespace] = useState('default');
  const [isDeploying, setIsDeploying] = useState(false);
  const [packageStatuses, setPackageStatuses] = useState<Record<string, DeployPackageResult>>({});

  const agentlessServices: AwsServiceMatrixEntry[] = useMemo(
    () =>
      selectedServiceIds
        .map((id) => AWS_SERVICES_MAP.get(id))
        .filter(
          (s): s is AwsServiceMatrixEntry =>
            s !== undefined && s.deliveryMethods.some((dm) => dm.method === 'agentless')
        ),
    [selectedServiceIds]
  );

  const servicesByPackage = useMemo(() => {
    const map = new Map<string, AwsServiceMatrixEntry[]>();
    for (const service of agentlessServices) {
      const group = map.get(service.packageName) ?? [];
      group.push(service);
      map.set(service.packageName, group);
    }
    return map;
  }, [agentlessServices]);

  const failedPackages = useMemo(
    () =>
      Object.entries(packageStatuses)
        .filter(([, s]) => s.status === 'error')
        .map(([pkg]) => pkg),
    [packageStatuses]
  );

  const handleDeploy = useCallback(
    async (packageNames?: string[]) => {
      const targets = packageNames ?? [...servicesByPackage.keys()];
      const isInitialDeploy = packageNames === undefined;

      if (targets.length === 0) {
        onContinue();
        return;
      }

      const idleStatuses = Object.fromEntries(
        targets.map((pkg) => [pkg, { status: 'idle' as const }])
      );
      setIsDeploying(true);
      setPackageStatuses((prev) => ({ ...prev, ...idleStatuses }));
      updateDeployStep({ isDeploying: true, packageStatuses: idleStatuses });

      if (isInitialDeploy) {
        onContinue();
      }

      const globalRegion = serviceSettings?.globalRegion ?? '';
      const storedServiceVars = serviceSettings?.serviceVars ?? {};

      const results = await Promise.allSettled(
        targets.map((packageName) =>
          deployPackage(packageName, servicesByPackage.get(packageName) ?? [], {
            namespace,
            globalRegion,
            storedServiceVars,
            connectStep,
          })
        )
      );

      const { nextStatuses } = collectDeployResults(results, targets);
      setPackageStatuses((prev) => ({ ...prev, ...nextStatuses }));
      setIsDeploying(false);
      updateDeployStep({
        isDeploying: false,
        packageStatuses: { ...idleStatuses, ...nextStatuses },
      });
    },
    [servicesByPackage, serviceSettings, connectStep, namespace, onContinue, updateDeployStep]
  );

  useEffect(() => {
    registerDeployHandler(handleDeploy);
  }, [handleDeploy, registerDeployHandler]);

  return { namespace, setNamespace, isDeploying, packageStatuses, failedPackages, handleDeploy };
}
