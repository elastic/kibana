/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { AuthenticateAndDeployStepState } from '../../onboarding_flow_context';
import { resolveFieldMeta, toTyped } from '../service_settings_step/field_config';
import type { ServiceVars } from '../service_settings_step/use_service_settings';

interface PackageInputEntry {
  enabled: boolean;
  vars?: Record<string, string | boolean | string[]>;
  streams: Record<string, { enabled: boolean; vars: Record<string, string | boolean | string[]> }>;
}

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
    const meta = resolveFieldMeta(service, key);
    if (meta) {
      result[key] = toTyped(value, meta);
    } else {
      result[key] = value;
    }
  }

  // Emit manifest defaults for show_user fields not explicitly set by the user.
  // This ensures required fields with manifest defaults are sent to Fleet even when
  // the user never opened the flyout.
  const allShowUserFields = [...(service.requiredConfig ?? []), ...(service.optionalConfig ?? [])];
  for (const key of allShowUserFields) {
    if (key in result) continue;
    const meta = resolveFieldMeta(service, key);
    if (!meta) continue;
    const typed = toTyped(undefined, meta);
    // Only emit when there is an actual manifest default (non-empty string or explicit bool).
    if (meta.isBool || (typeof typed === 'string' && typed !== '')) {
      result[key] = typed;
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
    const streamKey = `${service.packageName}.${service.id}`;
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
