/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../../aws_service_matrix';
import type { AuthenticateAndDeployStepState } from '../../../onboarding_flow_context';
import type { ServiceVars } from '../../service_settings_step/use_service_settings';
import { buildPackageInputs, buildPackageVars, getPackageVarNames } from '../package_inputs';
import type { PackageInputEntry, AgentCredentialVars } from '../package_inputs';
import { REGION_FIELD_NAMES } from '../../service_settings_step/field_config';
import type { DeployGroup } from '../deploy_groups';

export interface BuildPackagePolicyOpts {
  namespace: string;
  globalRegion: string;
  storedServiceVars: Record<string, ServiceVars>;
  authenticateAndDeployStep: AuthenticateAndDeployStepState;
  pkgVersion: string;
  agentCredentials?: AgentCredentialVars;
}

export interface PkgInfo {
  vars?: Array<{ name: string }>;
  version?: string;
  /** All policy templates from the package manifest — used to disable unrelated inputs. */
  policy_templates?: Array<{
    name: string;
    inputs?: Array<{ type: string; id?: string }>;
  }>;
}

/**
 * Build a human-readable package policy name for a group.
 *
 * - Bundled originals (isDuplicateGroup: false): named after the package (e.g. "aws-logs").
 *   Date.now() suffix prevents cross-session name collisions (Fleet enforces unique names).
 * - Duplicates (isDuplicateGroup: true): named after the instance name the user typed.
 */
export function buildPackagePolicyName(group: DeployGroup): string {
  if (group.isDuplicateGroup) {
    const { instance } = group.members[0];
    const safe = instance.name.slice(0, 60).replace(/[^a-zA-Z0-9_\-. ]/g, '_');
    return `${safe}-${Date.now()}`;
  }
  // Bundled originals — named after the package.
  const pkg = group.groupId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return `${pkg}-${Date.now()}`;
}

/**
 * Build the set of input keys belonging to policy templates OTHER than this service's PT.
 *
 * Fleet's simplified-to-legacy expansion calls packageToPackagePolicy(pkgInfo, ...) which expands
 * ALL policy templates' inputs and enables them according to their manifest defaults. Unrelated
 * inputs that default to enabled will then be validated — and fail if their required vars are
 * absent. Explicitly marking them disabled prevents validation (Fleet skips disabled inputs/streams).
 *
 * Input key format: `<ptName>-<inputType>` — the same format buildPackageInputs uses.
 */
function buildDisabledInputsForOtherTemplates(
  pkgInfo: PkgInfo,
  servicePolicyTemplates: string[]
): Record<string, { enabled: false }> {
  const ptSet = new Set(servicePolicyTemplates);
  const disabled: Record<string, { enabled: false }> = {};
  for (const pt of pkgInfo.policy_templates ?? []) {
    if (ptSet.has(pt.name)) continue;
    for (const input of pt.inputs ?? []) {
      const inputType = input.id ?? input.type;
      disabled[`${pt.name}-${inputType}`] = { enabled: false };
    }
  }
  return disabled;
}

/** Recover the input type from buildPackageInputs' `<ptName>-<inputType>` key. */
function getInputType(inputKey: string, service: AwsServiceMatrixEntry): string {
  const ptName = service.policyTemplate ?? service.id;
  return inputKey.startsWith(`${ptName}-`) ? inputKey.slice(ptName.length + 1) : inputKey;
}

/** Required user-facing var names for one input — the same narrowing step 2 applies. */
function getRequiredVarNamesForInput(service: AwsServiceMatrixEntry, inputType: string): string[] {
  return Object.entries(service.varDefsByInput?.[inputType] ?? {})
    .filter(([name, rawDef]) => {
      const def = rawDef as { required?: boolean; show_user?: boolean; type?: string };
      if (def?.required !== true) return false;
      if (def.show_user !== true) return false;
      if (def.type === 'bool') return false;
      if (REGION_FIELD_NAMES.has(name)) return false;
      return true;
    })
    .map(([name]) => name);
}

function isVarSatisfied(value: string | boolean | string[] | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true; // booleans and numbers are satisfied by being present
}

function pruneUnsatisfiedInputs(
  inputs: Record<string, PackageInputEntry>,
  service: AwsServiceMatrixEntry
): Record<string, PackageInputEntry> {
  const kept: Record<string, PackageInputEntry> = {};

  for (const [inputKey, entry] of Object.entries(inputs)) {
    const requiredVarNames = getRequiredVarNamesForInput(service, getInputType(inputKey, service));

    if (requiredVarNames.length === 0) {
      kept[inputKey] = entry;
      continue;
    }

    // Every stream of the input must satisfy every required var. Streams are per data stream,
    // and Fleet validates each one independently.
    const allStreamsSatisfied = Object.values(entry.streams).every((stream) =>
      requiredVarNames.every((name) => isVarSatisfied(stream.vars?.[name]))
    );

    if (allStreamsSatisfied) {
      kept[inputKey] = entry;
    }
  }

  return kept;
}

/**
 * Human-readable list of the required vars that blocked every input, for the error message.
 * Reported as `input: var, var` per input so a multi-input service says which one is closest.
 */
function describeMissingRequiredVars(
  inputs: Record<string, PackageInputEntry>,
  service: AwsServiceMatrixEntry
): string {
  const parts: string[] = [];

  for (const [inputKey, entry] of Object.entries(inputs)) {
    const inputType = getInputType(inputKey, service);
    const requiredVarNames = getRequiredVarNamesForInput(service, inputType);
    const missing = new Set<string>();

    for (const stream of Object.values(entry.streams)) {
      for (const name of requiredVarNames) {
        if (!isVarSatisfied(stream.vars?.[name])) missing.add(name);
      }
    }

    if (missing.size > 0) parts.push(`${inputType}: ${[...missing].join(', ')}`);
  }

  return parts.join('; ');
}

/** Map package policy ids back by name. Index alignment is an undocumented property of the
 *  server-side loop — names are ours and unique so keying by name is safe. */
export function mapPolicyIdsByName(
  responsePolicies: Array<{ id: string; name: string }> | undefined
): Map<string, string> {
  return new Map((responsePolicies ?? []).map((pp) => [pp.name, pp.id]));
}

/**
 * Build the package-policy body for a deploy group (one or more services sharing a package).
 *
 * For bundled originals, all members' inputs are merged into one document via buildPackageInputs.
 * For duplicate groups, there is exactly one member and the build is equivalent to the old
 * per-instance approach.
 *
 * NOTE: cloud_connector is NOT included — it is an agentless-only auth mechanism.
 * Any connectorId on authenticateAndDeployStep is intentionally ignored here.
 *
 * NOTE: namespace is intentionally omitted per package policy — Fleet schema documents
 * "When not specified, it inherits the agent policy namespace". Only the agent policy carries it.
 */
export async function buildGroupPackagePolicy(
  group: DeployGroup,
  pkgInfo: PkgInfo,
  opts: BuildPackagePolicyOpts
): Promise<{
  name: string;
  package: { name: string; version: string };
  vars?: Record<string, string>;
  inputs: Record<string, unknown>;
}> {
  const { members } = group;
  const firstService = members[0].service;
  const {
    globalRegion,
    storedServiceVars,
    authenticateAndDeployStep,
    pkgVersion,
    agentCredentials,
  } = opts;

  // Build serviceVarsMap for all members. Key by service.id for buildPackageInputs.
  // Look up vars by instanceId first; fall back to serviceId for sessions predating instance keying.
  const serviceVarsMap: Record<string, ServiceVars> = {};
  for (const { instance, service } of members) {
    serviceVarsMap[service.id] = storedServiceVars[instance.instanceId] ??
      storedServiceVars[instance.serviceId] ?? {
        enabledDataStreams: service.dataStreams,
        varsByDataStream: {},
      };
  }

  const services = members.map(({ service }) => service);
  const allInputs = buildPackageInputs(services, serviceVarsMap, globalRegion);

  // For a bundled group (multiple services), we apply per-service pruning independently.
  // For a duplicate group (one member), this is equivalent to the old single-target pruning.
  // We prune inputs per-service and merge results.
  const prunedInputs: Record<string, PackageInputEntry> = {};
  if (group.isDuplicateGroup || members.length === 1) {
    // Single-member group — prune against that service's varDefs.
    const pruned = pruneUnsatisfiedInputs(allInputs, firstService);
    Object.assign(prunedInputs, pruned);
  } else {
    // Bundled originals — each service contributes its own inputs. Prune per service.
    for (const { service } of members) {
      // Extract only the inputs belonging to this service's policy template.
      const ptName = service.policyTemplate ?? service.id;
      const serviceInputs = Object.fromEntries(
        Object.entries(allInputs).filter(([key]) => key.startsWith(`${ptName}-`))
      );
      const pruned = pruneUnsatisfiedInputs(serviceInputs, service);
      Object.assign(prunedInputs, pruned);
    }
  }

  const pkgVarNames = getPackageVarNames(pkgInfo);
  const vars = buildPackageVars(
    globalRegion,
    authenticateAndDeployStep.staticKeys,
    pkgVarNames,
    agentCredentials
  );

  if (Object.keys(prunedInputs).length === 0) {
    if (Object.keys(allInputs).length === 0) {
      // No inputs were built at all — the service has no configured data streams (e.g. aws_logs
      // which has no dataStreams in the matrix). Send all inputs explicitly disabled so Fleet
      // installs the package with everything off, matching the Fleet UI's default toggle state.
      const selfDisabled: Record<string, { enabled: false }> = {};
      for (const { service } of members) {
        const servicePt = service.policyTemplate ?? service.id;
        for (const pt of pkgInfo.policy_templates ?? []) {
          if (pt.name !== servicePt) continue;
          for (const input of pt.inputs ?? []) {
            const inputType = input.id ?? input.type;
            selfDisabled[`${pt.name}-${inputType}`] = { enabled: false };
          }
        }
      }
      const servicePts = members.map(({ service }) => service.policyTemplate ?? service.id);
      const disabledOtherInputs = buildDisabledInputsForOtherTemplates(pkgInfo, servicePts);
      return {
        name: buildPackagePolicyName(group),
        package: { name: firstService.packageName, version: pkgVersion },
        ...(vars ? { vars } : {}),
        inputs: { ...disabledOtherInputs, ...selfDisabled },
      };
    }
    // For a single-member group, report the specific missing fields.
    if (members.length === 1) {
      const missing = describeMissingRequiredVars(allInputs, firstService);
      throw new Error(
        `No fully configured input for ${firstService.name}` +
          (missing ? ` — missing ${missing}.` : '.')
      );
    }
    // For a bundled group, every service stripped its inputs — report the first one.
    throw new Error(`No fully configured input for ${firstService.name} (and possibly others).`);
  }

  // Disable all inputs from other policy templates in the package.
  const servicePts = members.map(({ service }) => service.policyTemplate ?? service.id);
  const disabledOtherInputs = buildDisabledInputsForOtherTemplates(pkgInfo, servicePts);

  return {
    name: buildPackagePolicyName(group),
    package: { name: firstService.packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    // disabled entries first so our enabled inputs win if there's any key overlap
    inputs: { ...disabledOtherInputs, ...prunedInputs },
  };
}
