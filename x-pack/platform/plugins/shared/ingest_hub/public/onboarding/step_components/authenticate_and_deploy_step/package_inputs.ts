/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderIacTemplateIntegration } from '@kbn/fleet-plugin/public';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { makeDsView } from '../../aws_service_matrix';
import type { AuthenticateAndDeployStepState } from '../../onboarding_flow_context';
import { resolveFieldMeta, toTyped } from '../service_settings_step/field_config';
import type {
  ServiceVars,
  ServiceDataStreamVars,
  ServiceInstance,
} from '../service_settings_step/use_service_settings';

export interface PackageInputEntry {
  enabled: boolean;
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

  // Backfill region from globalRegion when not explicitly set — but only when
  // the manifest actually defines the region field at stream level. Input-level
  // region vars (e.g. aws_region for guardduty) must not be emitted in streams[].vars;
  // Fleet rejects them as "not found".
  const regionField = getRegionFieldName(service, activeInput);
  if (regionField && !result[regionField] && globalRegion) {
    const regionMeta = resolveFieldMeta(service, activeInput, regionField);
    if (regionMeta) {
      result[regionField] = globalRegion;
    }
  }

  return result;
}

/** Input types active for one data stream: the user's choice, else the manifest defaults (single-DS → all inputs ON). */
function resolveActiveInputs(
  service: AwsServiceMatrixEntry,
  dsId: string,
  dsVars: ServiceDataStreamVars
): string[] {
  const dsInfo = service.varDefsByDataStream?.[dsId];
  const isSingleDs = service.dataStreams.length === 1;
  return dsVars.enabledInputs.length
    ? dsVars.enabledInputs
    : isSingleDs
    ? dsInfo?.inputs ?? service.inputs ?? []
    : dsInfo?.defaultEnabledInputs?.length
    ? dsInfo.defaultEnabledInputs
    : dsInfo?.inputs?.length
    ? dsInfo.inputs.slice(0, 1)
    : service.defaultEnabledInputs?.length
    ? service.defaultEnabledInputs.slice(0, 1)
    : (service.inputs ?? []).slice(0, 1);
}

/**
 * Distinguish "never configured" (key absent → default to all DS) from "explicitly emptied"
 * (key present with enabledDataStreams: [] → user turned everything off → skip).
 * Vars are keyed by instance id since duplicates exist; `instanceId` falls back to the service id
 * for sessions predating instance keying — the same chain deployGroup applies.
 */
function resolveServiceVars(
  storedServiceVars: Record<string, ServiceVars>,
  service: AwsServiceMatrixEntry,
  instanceId: string = service.id
): ServiceVars {
  return (
    storedServiceVars[instanceId] ??
    storedServiceVars[service.id] ?? {
      enabledDataStreams: service.dataStreams,
      varsByDataStream: {},
    }
  );
}

const EMPTY_DS_VARS: Readonly<ServiceDataStreamVars> = { enabledInputs: [], varsByInput: {} };

export function buildPackageInputs(
  services: AwsServiceMatrixEntry[],
  storedServiceVars: Record<string, ServiceVars>,
  globalRegion: string
): Record<string, PackageInputEntry> {
  const inputs: Record<string, PackageInputEntry> = {};

  for (const service of services) {
    const serviceVars = resolveServiceVars(storedServiceVars, service);

    for (const dsId of serviceVars.enabledDataStreams) {
      const dsVars = serviceVars.varsByDataStream[dsId] ?? EMPTY_DS_VARS;
      const activeInputs = resolveActiveInputs(service, dsId, dsVars);

      // Fleet input key: <policyTemplateName>-<inputType>
      // Use policyTemplate when present (e.g. aws_cloudwatch_input_otel entries where id !== PT name).
      const ptName = service.policyTemplate ?? service.id;
      const dsView = makeDsView(service, dsId);
      // Fleet stream key for input packages: <packageName>.<policyTemplateName>
      // Fleet synthesizes one data stream per PT with dataset = packageName.ptName
      // (see getNormalizedDataStreams in Fleet's policy_template.ts). Regular packages use the
      // actual data stream path instead.
      // isInputPackage: buildAwsServiceMatrix sets entry.id = pt.name for input-package PTs, so
      // dsId === service.id iff the service was built from a PT (not a standalone data stream).
      const isInputPackage = dsId === service.id && !!service.policyTemplate;
      const streamKey = isInputPackage
        ? `${service.packageName}.${ptName}`
        : `${service.packageName}.${dsId}`;

      for (const inputType of activeInputs) {
        const inputKey = `${ptName}-${inputType}`;
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

/**
 * The integration set a Federated Identity must cover for the instances Deploy will create: one
 * entry per package, one policy template (`policyTemplate ?? id`) per template — members sharing
 * a template (original + duplicate, or two services aliasing one manifest template) merge into
 * one entry with the union of the input types active across their enabled data streams. Takes
 * deploy-group members and resolves vars per instance exactly like deployGroup, so the template
 * the user launches grants exactly what Deploy creates.
 * Sorted by package, template and input so the result is a stable react-query key.
 */
export function buildIacIntegrations(
  members: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>,
  storedServiceVars: Record<string, ServiceVars>
): RenderIacTemplateIntegration[] {
  const inputsByPackageAndTemplate = new Map<string, Map<string, Set<string>>>();

  for (const { instance, service } of members) {
    const serviceVars = resolveServiceVars(storedServiceVars, service, instance.instanceId);
    const activeInputs = new Set<string>();
    for (const dsId of serviceVars.enabledDataStreams) {
      const dsVars = serviceVars.varsByDataStream[dsId] ?? EMPTY_DS_VARS;
      for (const inputType of resolveActiveInputs(service, dsId, dsVars)) {
        activeInputs.add(inputType);
      }
    }
    if (activeInputs.size === 0) continue;

    const templates =
      inputsByPackageAndTemplate.get(service.packageName) ?? new Map<string, Set<string>>();
    inputsByPackageAndTemplate.set(service.packageName, templates);
    const ptName = service.policyTemplate ?? service.id;
    const mergedInputs = templates.get(ptName) ?? new Set<string>();
    templates.set(ptName, mergedInputs);
    for (const inputType of activeInputs) {
      mergedInputs.add(inputType);
    }
  }

  return [...inputsByPackageAndTemplate.entries()].sort(byKey).map(([name, templates]) => ({
    name,
    policyTemplates: [...templates.entries()].sort(byKey).map(([ptName, inputTypes]) => ({
      name: ptName,
      enabledInputs: [...inputTypes].sort(),
    })),
  }));
}

/** Code-unit ordering on map-entry keys, so the result never depends on locale collation. */
function byKey<T>([a]: [string, T], [b]: [string, T]): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export interface AgentCredentialVars {
  method: 'direct_access_keys' | 'temporary_keys' | 'shared_credentials' | 'assume_role';
  /** direct_access_keys / temporary_keys — access key id (non-secret) */
  access_key_id?: string;
  /** direct_access_keys / temporary_keys — secret (memory-only, never persisted) */
  secret_access_key?: string;
  /** temporary_keys — session token (memory-only, never persisted) */
  session_token?: string;
  /** shared_credentials — path to the shared credentials file */
  shared_credential_file?: string;
  /** shared_credentials — profile name within the file */
  credential_profile_name?: string;
  /** assume_role — role ARN */
  role_arn?: string;
}

export function buildPackageVars(
  globalRegion: string,
  staticKeys: AuthenticateAndDeployStepState['staticKeys'],
  pkgVarNames: Set<string>,
  agentCredentials?: AgentCredentialVars
): Record<string, string> | undefined {
  const vars: Record<string, string> = {};
  if (globalRegion && pkgVarNames.has('default_region')) vars.default_region = globalRegion;
  // 'region' (distinct from 'default_region') is a package-level var on aws_cloudwatch_input_otel
  // today; ECS packages use 'default_region'. The pkgVarNames guard ensures it only fires when
  // the deployed package actually declares it.
  if (globalRegion && pkgVarNames.has('region')) vars.region = globalRegion;

  if (agentCredentials) {
    const { method } = agentCredentials;
    if (method === 'direct_access_keys' || method === 'temporary_keys') {
      if (agentCredentials.access_key_id && agentCredentials.secret_access_key) {
        if (pkgVarNames.has('access_key_id')) vars.access_key_id = agentCredentials.access_key_id;
        if (pkgVarNames.has('secret_access_key'))
          vars.secret_access_key = agentCredentials.secret_access_key;
      }
      if (method === 'temporary_keys' && agentCredentials.session_token) {
        if (pkgVarNames.has('session_token')) vars.session_token = agentCredentials.session_token;
      }
    } else if (method === 'shared_credentials') {
      if (agentCredentials.shared_credential_file && pkgVarNames.has('shared_credential_file'))
        vars.shared_credential_file = agentCredentials.shared_credential_file;
      if (agentCredentials.credential_profile_name && pkgVarNames.has('credential_profile_name'))
        vars.credential_profile_name = agentCredentials.credential_profile_name;
    } else if (method === 'assume_role') {
      if (agentCredentials.role_arn && pkgVarNames.has('role_arn'))
        vars.role_arn = agentCredentials.role_arn;
    }
  } else if (staticKeys?.access_key_id && staticKeys?.secret_access_key) {
    // Agentless path: staticKeys is used when no agentCredentials are provided.
    if (pkgVarNames.has('access_key_id')) vars.access_key_id = staticKeys.access_key_id;
    if (pkgVarNames.has('secret_access_key')) vars.secret_access_key = staticKeys.secret_access_key;
  }
  return Object.keys(vars).length > 0 ? vars : undefined;
}

export function getPackageVarNames(pkgInfo: { vars?: Array<{ name: string }> }): Set<string> {
  return new Set((pkgInfo.vars ?? []).map((v) => v.name));
}

/**
 * Converts raw serviceVars (string values from session storage) to typed form for SO persistence.
 * Multi-value fields (e.g. `regions`) are split from comma-separated strings to string arrays so
 * the SO reflects the exact typed values that would be sent to the Fleet API.
 */
export function toSOServiceVars(
  serviceVars: Record<string, ServiceVars>,
  servicesMap: Map<string, AwsServiceMatrixEntry>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [serviceId, vars] of Object.entries(serviceVars)) {
    const service = servicesMap.get(serviceId);
    if (!service) {
      result[serviceId] = vars;
      continue;
    }
    const typedVarsByDataStream: Record<string, unknown> = {};
    for (const [dsId, dsVars] of Object.entries(vars.varsByDataStream)) {
      const dsView = makeDsView(service, dsId);
      const typedVarsByInput: Record<string, Record<string, unknown>> = {};
      for (const [inputType, inputVars] of Object.entries(dsVars.varsByInput)) {
        const typedFields: Record<string, unknown> = {};
        for (const [fieldKey, rawValue] of Object.entries(inputVars)) {
          const meta = resolveFieldMeta(dsView, inputType, fieldKey);
          typedFields[fieldKey] = meta ? toTyped(rawValue, meta) : rawValue;
        }
        typedVarsByInput[inputType] = typedFields;
      }
      typedVarsByDataStream[dsId] = { ...dsVars, varsByInput: typedVarsByInput };
    }
    result[serviceId] = { ...vars, varsByDataStream: typedVarsByDataStream };
  }
  return result;
}
