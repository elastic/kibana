/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent-based deploy module — sibling to deploy_groups.ts but deliberately NOT an extension of it.
 *
 * Key simplification: the streamKey collision that forced DeployGroup / isDuplicateGroup bundling
 * for agentless does NOT apply here. Agentless merges N services into ONE inputs record where
 * duplicate stream keys (`${packageName}.${dsId}`) overwrite each other. Agent-based creates a
 * SEPARATE package-policy document per instance, each built from a single-member service list, so
 * two duplicate VPC-flow instances with different bucket_arns each land in their own document
 * without collision. No grouping machinery needed.
 */

import {
  sendCreateAgentPolicyWithPackagePolicies,
  sendCreatePackagePolicy,
  sendGetAgentPolicies,
} from '@kbn/fleet-plugin/public';
import { sendGetPackageInfoByKeyForRq } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type {
  AuthenticateAndDeployStepState,
  ServiceChipState,
} from '../../onboarding_flow_context';
import type { ServiceVars, ServiceInstance } from '../service_settings_step/use_service_settings';
import { buildPackageInputs, buildPackageVars, getPackageVarNames } from './package_inputs';
import type { PackageInputEntry, AgentCredentialVars } from './package_inputs';
// Reused so the prune bar stays identical to the one step 2 applies when it decides a service
// is fully configured. Diverging here produces "configure it in step 2" for an already-valid form.
import { REGION_FIELD_NAMES } from '../service_settings_step/field_config';
import { buildInstanceStatuses } from './deploy_groups';

export interface AgentBasedTarget {
  instance: ServiceInstance;
  service: AwsServiceMatrixEntry;
}

/**
 * Reconcile persisted instances against the current selectedServiceIds — the same logic
 * buildDeployGroups applies. Without this, a user who goes back to step 1 and changes their
 * selection would deploy stale instances.
 *
 * Unlike buildDeployGroups, we accept ALL services regardless of deploymentMethods — the
 * agent-based path isn't restricted to services that declare `managed_integration`.
 */
export function buildAgentBasedTargets(
  instances: ServiceInstance[],
  selectedServiceIds: string[],
  servicesMap: Map<string, AwsServiceMatrixEntry>
): AgentBasedTarget[] {
  const selectedSet = new Set(selectedServiceIds);
  const kept = instances.filter((inst) => selectedSet.has(inst.serviceId));
  const coveredServiceIds = new Set(kept.map((i) => i.serviceId));

  const added: ServiceInstance[] = [];
  for (const id of selectedServiceIds) {
    if (!coveredServiceIds.has(id)) {
      const service = servicesMap.get(id);
      if (service?.showInUI) {
        added.push({ instanceId: id, serviceId: id, name: service.name, isDuplicate: false });
      }
    }
  }

  const resolved: ServiceInstance[] = [...kept, ...added];
  const targets: AgentBasedTarget[] = [];

  for (const instance of resolved) {
    const service = servicesMap.get(instance.serviceId);
    if (!service) continue;
    targets.push({ instance, service });
  }

  return targets;
}

/**
 * Human-readable package policy name keyed on the instance name (what the user typed in the
 * duplicate modal). Using instanceId (e.g. "vpcflow__dup-1") would be meaningless in Fleet's UI.
 * Date.now() suffix prevents cross-session name collisions (Fleet enforces unique names).
 */
export function buildPackagePolicyName(instance: ServiceInstance): string {
  const safe = instance.name.slice(0, 60).replace(/[^a-zA-Z0-9_\-. ]/g, '_');
  return `${safe}-${Date.now()}`;
}

interface BuildPackagePolicyOpts {
  namespace: string;
  globalRegion: string;
  storedServiceVars: Record<string, ServiceVars>;
  authenticateAndDeployStep: AuthenticateAndDeployStepState;
  pkgVersion: string;
  agentCredentials?: AgentCredentialVars;
}

interface PkgInfo {
  vars?: Array<{ name: string }>;
  version?: string;
  /** All policy templates from the package manifest — used to disable unrelated inputs. */
  policy_templates?: Array<{
    name: string;
    inputs?: Array<{ type: string; id?: string }>;
  }>;
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
  servicePolicyTemplate: string
): Record<string, { enabled: false }> {
  const disabled: Record<string, { enabled: false }> = {};
  for (const pt of pkgInfo.policy_templates ?? []) {
    if (pt.name === servicePolicyTemplate) continue;
    for (const input of pt.inputs ?? []) {
      const inputType = input.id ?? input.type;
      disabled[`${pt.name}-${inputType}`] = { enabled: false };
    }
  }
  return disabled;
}

/**
 * Build the package-policy body for a single target instance.
 *
 * NOTE: cloud_connector is NOT included — it is an agentless-only auth mechanism.
 * Any connectorId on authenticateAndDeployStep is intentionally ignored here.
 *
 * NOTE: namespace is intentionally omitted per package policy — Fleet schema documents
 * "When not specified, it inherits the agent policy namespace". Only the agent policy carries it.
 */
async function buildInstancePackagePolicy(
  target: AgentBasedTarget,
  pkgInfo: PkgInfo,
  opts: BuildPackagePolicyOpts
): Promise<{
  name: string;
  package: { name: string; version: string };
  vars?: Record<string, string>;
  inputs: Record<string, unknown>;
}> {
  const { instance, service } = target;
  const {
    globalRegion,
    storedServiceVars,
    authenticateAndDeployStep,
    pkgVersion,
    agentCredentials,
  } = opts;

  // Var lookup: instanceId first; fall back to serviceId for sessions predating instance keying.
  // Same legacy fallback as deploy_groups.ts:169-174.
  const instanceVars: ServiceVars = storedServiceVars[instance.instanceId] ??
    storedServiceVars[instance.serviceId] ?? {
      enabledDataStreams: service.dataStreams,
      varsByDataStream: {},
    };

  // Build per-instance inputs from a single-member service array.
  // This is where the duplicate fix lands: two vpcflow duplicates each get their own inputs
  // from their own vars, so distinct bucket_arns land in two separate documents.
  const allInputs = buildPackageInputs([service], { [service.id]: instanceVars }, globalRegion);

  // Drop inputs whose required stream vars are unsatisfied.
  //
  // buildPackageInputs defaults a single-data-stream service to ALL of its inputs (see the
  // isSingleDs branch), which is right for the flyout's "all ON" display but wrong for a real
  // create request. Step 2 only collects vars for the input the user configured, so the other
  // inputs arrive with empty vars and Fleet rejects the whole policy — e.g. GuardDuty emitting
  // both its configured input and `httpjson`, producing
  // `inputs.guardduty-httpjson.streams.aws.guardduty.vars.detector_id: ["Detector ID is required"]`.
  //
  // Pruning rather than sending them disabled: a disabled input still fails validation when its
  // required vars are missing, so `enabled: false` would not help.
  const inputs = pruneUnsatisfiedInputs(allInputs, service);
  if (Object.keys(inputs).length === 0) {
    if (Object.keys(allInputs).length === 0) {
      // No inputs were built at all — the service has no configured data streams (e.g. aws_logs
      // which has no dataStreams in the matrix). Send all inputs explicitly disabled so Fleet
      // installs the package with everything off, matching the Fleet UI's default toggle state.
      // buildDisabledInputsForOtherTemplates already covers the other-template inputs; here we
      // also disable the service's own policy-template inputs.
      const selfDisabled: Record<string, { enabled: false }> = {};
      for (const pt of pkgInfo.policy_templates ?? []) {
        if (pt.name !== (service.policyTemplate ?? service.id)) continue;
        for (const input of pt.inputs ?? []) {
          const inputType = input.id ?? input.type;
          selfDisabled[`${pt.name}-${inputType}`] = { enabled: false };
        }
      }
      const servicePt = service.policyTemplate ?? service.id;
      const disabledOtherInputs = buildDisabledInputsForOtherTemplates(pkgInfo, servicePt);
      const pkgVarNames = getPackageVarNames(pkgInfo);
      const vars = buildPackageVars(
        globalRegion,
        authenticateAndDeployStep.staticKeys,
        pkgVarNames,
        agentCredentials
      );
      return {
        name: buildPackagePolicyName(instance),
        package: { name: service.packageName, version: pkgVersion },
        ...(vars ? { vars } : {}),
        inputs: { ...disabledOtherInputs, ...selfDisabled },
      };
    }
    // Name the fields rather than saying "configure it in step 2" — if the prune bar and step 2
    // ever diverge again, a generic message sends the user to a form that already looks complete.
    const missing = describeMissingRequiredVars(allInputs, service);
    throw new Error(
      `No fully configured input for ${service.name}` + (missing ? ` — missing ${missing}.` : '.')
    );
  }

  const pkgVarNames = getPackageVarNames(pkgInfo);
  // staticKeys may be undefined if the user chose a different credential method.
  const vars = buildPackageVars(
    globalRegion,
    authenticateAndDeployStep.staticKeys,
    pkgVarNames,
    agentCredentials
  );

  // Disable all inputs from other policy templates in the package. Fleet's simplified-to-legacy
  // expansion (simplifiedPackagePolicytoNewPackagePolicy → packageToPackagePolicy) adds ALL policy
  // templates' inputs using their manifest defaults, then validates required vars for every enabled
  // input. Without this, sending only `config-cel` for AWS Config would leave securityhub-httpjson,
  // guardduty-httpjson, etc. enabled with no vars → 400 "aws_region is required". Fleet skips
  // validation for disabled inputs, so marking unrelated ones disabled is the correct gate.
  const servicePt = service.policyTemplate ?? service.id;
  const disabledOtherInputs = buildDisabledInputsForOtherTemplates(pkgInfo, servicePt);

  return {
    name: buildPackagePolicyName(instance),
    package: { name: service.packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    // disabled entries first so our enabled inputs win if there's any key overlap
    inputs: { ...disabledOtherInputs, ...inputs },
  };
}

/**
 * Keep only inputs whose required *user-facing* vars are present and non-empty.
 *
 * The bar deliberately matches step 2's, because step 2 is what the user filled in — a stricter
 * rule here rejects a service the user was told was fully configured. Step 2 collects exactly
 * `getRequiredTextFields` (see field_config.ts), i.e. `requiredConfig` narrowed to vars that are:
 *   - `show_user: true` — anything behind "Advanced options" was never prompted for, and Fleet
 *     supplies the manifest default for it
 *   - not a bool — bools always have a value (`getRequiredBooleanFields` handles them separately)
 *   - not a region var — those come from the step-2 global region picker, not per-input fields,
 *     and buildStreamVars backfills them from globalRegion
 *
 * The input key emitted by buildPackageInputs is `<policyTemplateName>-<inputType>`, so the input
 * type is recovered by stripping the `<ptName>-` prefix. Vars are read per input from
 * varDefsByInput, since a var can be required for one input and absent from another (`aws_region`
 * is required on httpjson but not defined on aws-s3).
 *
 * An input with no required user-facing vars is always kept — there is nothing to be unsatisfied.
 */
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
function mapPolicyIdsByName(
  responsePolicies: Array<{ id: string; name: string }> | undefined
): Map<string, string> {
  return new Map((responsePolicies ?? []).map((pp) => [pp.name, pp.id]));
}

/**
 * Pull a human-readable message out of whatever a Fleet sender rejected with.
 *
 * sendRequestForRq rethrows `response.error` verbatim, and for a Kibana HTTP failure that is an
 * IHttpFetchError whose useful text lives in `body.message` — the server's validation detail —
 * while `.message` is only the generic status line. Reading `.message` first, or falling through
 * to String(), yields "[object Object]" for exactly the errors worth showing.
 *
 * Order: body.message (server detail) → message (Error) → body.error → JSON → String.
 */
export function extractErrorMessage(reason: unknown): string {
  if (reason === null || reason === undefined) return 'Unknown error';

  if (typeof reason === 'string') return reason;

  if (typeof reason === 'object') {
    const err = reason as {
      body?: { message?: unknown; error?: unknown };
      message?: unknown;
    };

    const bodyMessage = err.body?.message;
    if (typeof bodyMessage === 'string' && bodyMessage.trim() !== '') return bodyMessage;

    if (typeof err.message === 'string' && err.message.trim() !== '') return err.message;

    const bodyError = err.body?.error;
    if (typeof bodyError === 'string' && bodyError.trim() !== '') return bodyError;

    // Last resort before String(): a JSON dump is ugly but still diagnosable, unlike
    // "[object Object]".
    try {
      const json = JSON.stringify(reason);
      if (json && json !== '{}') return json;
    } catch {
      // circular or non-serialisable — fall through
    }
  }

  return String(reason);
}

// ── New Agent Policy path ─────────────────────────────────────────────────────────────────────

const POLICY_NAME_PREFIX = 'AWS Onboarding';

/**
 * Returns the next available agent policy name using Fleet's numbering pattern:
 * "AWS Onboarding 1", "AWS Onboarding 2", …
 *
 * Fetches existing policies matching the prefix and picks max(existing numbers) + 1.
 * Falls back to "AWS Onboarding 1" if the fetch fails or no matches exist.
 */
export async function buildAgentPolicyName(): Promise<string> {
  try {
    const resp = await sendGetAgentPolicies({
      kuery: `name: "${POLICY_NAME_PREFIX}*"`,
      perPage: 100,
    });
    const existing = resp.data?.items ?? [];
    const numbers = existing
      .map((p) => {
        const match = p.name.match(/^AWS Onboarding (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${POLICY_NAME_PREFIX} ${next}`;
  } catch {
    return `${POLICY_NAME_PREFIX} 1`;
  }
}

interface DeployNewAgentPolicyOpts extends BuildPackagePolicyOpts {
  agentPolicyName: string;
}

export interface DeployNewAgentPolicyResult {
  agentPolicyId: string;
  agentPolicyName: string;
  /** Package policy id keyed by instanceId */
  packagePolicyIdsByInstance: Record<string, string>;
}

/**
 * One-shot transactional creation of the agent policy + all package policies.
 *
 * Uses POST /internal/fleet/agent_and_package_policies (API_VERSIONS.public.v1).
 * Server-side handler rolls back on any failure: it deletes created package policies and
 * the agent policy, then rethrows. So a failure fails ALL instances atomically.
 *
 * See: fleet/server/routes/agent_policy/handlers.ts ~line 560.
 */
export async function deployNewAgentPolicy(
  targets: AgentBasedTarget[],
  opts: DeployNewAgentPolicyOpts
): Promise<DeployNewAgentPolicyResult> {
  const { agentPolicyName, namespace } = opts;

  // All targets in the same package share the same pkgVersion — fetch once per package.
  // In practice all selected AWS services share the aws package, so this is one fetch.
  const packageNames = [...new Set(targets.map((t) => t.service.packageName))];
  const pkgVersionByPackage: Record<string, string> = {};
  const pkgInfoByPackage: Record<string, PkgInfo> = {};
  await Promise.all(
    packageNames.map(async (pkgName) => {
      const resp = await sendGetPackageInfoByKeyForRq(pkgName);
      const version = resp.item?.version;
      if (!version) throw new Error(`Package ${pkgName} is not installed`);
      pkgVersionByPackage[pkgName] = version;
      pkgInfoByPackage[pkgName] = (resp.item ?? {}) as PkgInfo;
    })
  );

  const packagePoliciesWithTargets = await Promise.all(
    targets.map(async (target) => {
      const pkgVersion = pkgVersionByPackage[target.service.packageName];
      const pkgInfo = pkgInfoByPackage[target.service.packageName];
      const body = await buildInstancePackagePolicy(target, pkgInfo ?? {}, {
        ...opts,
        pkgVersion,
      });
      return { body, target };
    })
  );

  const response = await sendCreateAgentPolicyWithPackagePolicies({
    name: agentPolicyName,
    namespace,
    description: 'Created by AWS onboarding',
    monitoring_enabled: ['logs', 'metrics'],
    package_policies: packagePoliciesWithTargets.map(({ body }) => body),
  });

  const agentPolicyId: string = (response as any).item?.id ?? '';
  const responsePolicies: Array<{ id: string; name: string }> =
    (response as any).item?.package_policies ?? [];

  const byName = mapPolicyIdsByName(responsePolicies);
  const packagePolicyIdsByInstance: Record<string, string> = {};
  for (const { body, target } of packagePoliciesWithTargets) {
    const ppId = byName.get(body.name);
    if (ppId) {
      packagePolicyIdsByInstance[target.instance.instanceId] = ppId;
    }
  }

  return { agentPolicyId, agentPolicyName, packagePolicyIdsByInstance };
}

// ── Existing Agent Policy path ────────────────────────────────────────────────────────────────

interface DeployToExistingOpts extends BuildPackagePolicyOpts {
  selectedAgentPolicyIds: string[];
}

export interface DeployToExistingResult {
  /** Package policy id keyed by instanceId — only for succeeded instances */
  packagePolicyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  errorsByInstance: Record<string, string>;
}

/**
 * Creates one package policy per instance, each reused across all selected agent policies.
 *
 * Uses policy_ids (Fleet's reusable-package-policy feature) so we create N package policies,
 * NOT N×M: one integration config applied to multiple host groups. Each policy is created
 * independently so Promise.allSettled gives per-instance error granularity.
 *
 * namespace is intentionally omitted so each target policy's own namespace applies.
 */
export async function deployToExistingAgentPolicies(
  targets: AgentBasedTarget[],
  opts: DeployToExistingOpts
): Promise<DeployToExistingResult> {
  const { selectedAgentPolicyIds } = opts;

  // Fetch pkg info for all needed packages (usually just 'aws').
  const packageNames = [...new Set(targets.map((t) => t.service.packageName))];
  const pkgVersionByPackage: Record<string, string> = {};
  const pkgInfoByPackage: Record<string, { vars?: Array<{ name: string }> }> = {};
  await Promise.all(
    packageNames.map(async (pkgName) => {
      const resp = await sendGetPackageInfoByKeyForRq(pkgName);
      const version = resp.item?.version;
      if (!version) throw new Error(`Package ${pkgName} is not installed`);
      pkgVersionByPackage[pkgName] = version;
      pkgInfoByPackage[pkgName] = resp.item ?? {};
    })
  );

  const results = await Promise.allSettled(
    targets.map(async (target) => {
      const pkgVersion = pkgVersionByPackage[target.service.packageName];
      const pkgInfo = pkgInfoByPackage[target.service.packageName];
      const body = await buildInstancePackagePolicy(target, pkgInfo ?? {}, {
        ...opts,
        pkgVersion,
      });

      const response = await sendCreatePackagePolicy({
        ...body,
        policy_ids: selectedAgentPolicyIds,
      } as any);

      return {
        instanceId: target.instance.instanceId,
        ppId: (response as any)?.item?.id as string | undefined,
      };
    })
  );

  const packagePolicyIdsByInstance: Record<string, string> = {};
  const failedInstances: string[] = [];
  const errorsByInstance: Record<string, string> = {};

  for (let i = 0; i < targets.length; i++) {
    const instanceId = targets[i].instance.instanceId;
    const result = results[i];
    if (result.status === 'fulfilled' && result.value.ppId) {
      packagePolicyIdsByInstance[instanceId] = result.value.ppId;
    } else {
      failedInstances.push(instanceId);
      errorsByInstance[instanceId] =
        result.status === 'rejected' ? extractErrorMessage(result.reason) : 'Unknown error';
    }
  }

  return { packagePolicyIdsByInstance, failedInstances, errorsByInstance };
}

// ── Result collection (same contract as collectDeployResults) ─────────────────────────────────

export interface AgentBasedDeployOutcome {
  policyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  errorsByInstance: Record<string, string>;
}

/**
 * Build serviceStatuses for all targets.
 * Succeeded → 'detecting' (data detection polling will promote to 'receiving').
 * Failed → 'error'.
 */
export function buildAgentBasedInstanceStatuses(
  targets: AgentBasedTarget[],
  failedInstances: string[]
): Record<string, ServiceChipState> {
  return buildInstanceStatuses(
    targets.map((t) => t.instance.instanceId),
    failedInstances,
    'detecting'
  );
}
