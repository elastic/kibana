/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { makeDsView } from '../../aws_service_matrix';
import type { AuthenticateAndDeployStepState } from '../../onboarding_flow_context';
import { resolveFieldMeta, toTyped } from '../service_settings_step/field_config';
import type {
  ServiceVars,
  ServiceDataStreamVars,
} from '../service_settings_step/use_service_settings';

interface PackageInputEntry {
  enabled: boolean;
  vars?: Record<string, string | boolean | string[]>;
  streams: Record<string, { enabled: boolean; vars: Record<string, string | boolean | string[]> }>;
}

export function getRegionFieldName(
  service: AwsServiceMatrixEntry,
  activeInput: string | null
): string {
  const rc = service.requiredConfig ?? [];
  if (activeInput === 'aws-s3' && rc.includes('region')) return 'region';
  if (activeInput === 'aws-cloudwatch' && rc.includes('region_name')) return 'region_name';
  if (rc.includes('aws_region')) return 'aws_region';
  return '';
}

/**
 * Build Fleet stream vars for a single input of a single data stream.
 * `service` should already be scoped to the DS (via makeDsView) so that
 * requiredConfig/optionalConfig/varDefsByInput are DS-specific.
 */
export function buildStreamVars(
  service: AwsServiceMatrixEntry,
  dsVars: ServiceDataStreamVars,
  globalRegion: string,
  activeInput: string
): Record<string, string | boolean | string[]> {
  const result: Record<string, string | boolean | string[]> = {};

  for (const [key, value] of Object.entries(dsVars.varsByInput[activeInput] ?? {})) {
    const meta = resolveFieldMeta(service, activeInput, key);
    if (!meta) {
      result[key] = value;
      continue;
    }
    result[key] = toTyped(value, meta);
  }

  // Emit manifest defaults for show_user fields belonging to this input not explicitly set.
  const allShowUserFields = [...(service.requiredConfig ?? []), ...(service.optionalConfig ?? [])];
  for (const key of allShowUserFields) {
    if (key in result) continue;
    const meta = resolveFieldMeta(service, activeInput, key);
    if (!meta) continue;
    const typed = toTyped(undefined, meta);
    if (meta.isBool || (typeof typed === 'string' && typed !== '')) {
      result[key] = typed;
    }
  }

  // Backfill region from globalRegion when not explicitly set.
  const regionField = getRegionFieldName(service, activeInput);
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
    const serviceVars: ServiceVars = storedServiceVars[service.id] ?? {
      enabledDataStreams: [],
      varsByDataStream: {},
    };

    const activeDataStreams =
      serviceVars.enabledDataStreams.length > 0
        ? serviceVars.enabledDataStreams
        : service.dataStreams;

    for (const dsId of activeDataStreams) {
      const dsInfo = service.varDefsByDataStream?.[dsId];
      const dsVars = serviceVars.varsByDataStream[dsId] ?? { enabledInputs: [], varsByInput: {} };

      // Determine which inputs are active for this data stream.
      const activeInputs = dsVars.enabledInputs.length
        ? dsVars.enabledInputs
        : dsInfo?.defaultEnabledInputs?.length
        ? dsInfo.defaultEnabledInputs
        : dsInfo?.inputs?.length
        ? dsInfo.inputs.slice(0, 1)
        : service.defaultEnabledInputs?.length
        ? service.defaultEnabledInputs.slice(0, 1)
        : (service.inputs ?? []).slice(0, 1);

      // Fleet stream key: <packageName>.<dataStreamPath>
      const streamKey = `${service.packageName}.${dsId}`;
      // Fleet input key: <policyTemplateName>-<inputType>  (service.id is now the PT name)
      const dsView = makeDsView(service, dsId);

      for (const inputType of activeInputs) {
        const inputKey = `${service.id}-${inputType}`;
        const streamVars = buildStreamVars(dsView, dsVars, globalRegion, inputType);

        if (!inputs[inputKey]) {
          inputs[inputKey] = { enabled: true, streams: {} };
        }
        inputs[inputKey].streams[streamKey] = { enabled: true, vars: streamVars };
      }
    }
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
