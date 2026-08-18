/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { AuthenticateAndDeployStepState } from '../../onboarding_flow_context';
import { FIELD_CONFIG } from '../service_settings_step/field_config';
import type { ServiceVars } from '../service_settings_step/use_service_settings';

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

export function buildPackageVars(
  globalRegion: string,
  staticKeys: AuthenticateAndDeployStepState['staticKeys'],
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

export function getPackageVarNames(pkgInfo: { vars?: Array<{ name: string }> }): Set<string> {
  return new Set((pkgInfo.vars ?? []).map((v) => v.name));
}
