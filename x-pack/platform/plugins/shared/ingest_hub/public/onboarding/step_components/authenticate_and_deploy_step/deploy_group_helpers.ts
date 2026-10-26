/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance, ServiceVars } from '../service_settings_step/use_service_settings';
import type { DeployGroup } from './deploy_groups';
import { extractErrorMessage } from './deploy_errors';
import { MAX_POLICY_NAME_LENGTH } from '../service_settings_step/integration_settings';

export { reconcileInstances } from '../service_settings_step/instances';

const sanitizeGroupId = (groupId: string): string =>
  groupId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);

export const buildGroupPolicyNameStem = (group: DeployGroup): string =>
  group.policyNameStem ?? sanitizeGroupId(group.groupId);

export const DEFAULT_NAMESPACE = 'default';

/** The package whose services share the integration name exactly; other packages get a suffix. */
export const AWS_MAIN_PACKAGE_NAME = 'aws';

/** The package every service uses with the OTel data format; no other package is deployed then. */
export const AWS_OTEL_PACKAGE_NAME = 'aws_cloudwatch_input_otel';

/**
 * Packages the integration name already stands for, so a default name needs no package suffix:
 * `aws`, and the OTel package, which is the only one an OTel deploy uses.
 */
export const isMainPackageName = (packageName: string): boolean =>
  packageName === AWS_MAIN_PACKAGE_NAME || packageName === AWS_OTEL_PACKAGE_NAME;

/**
 * The package whose policy keeps the integration name as entered: the only package when a deploy
 * has just one, otherwise the main `aws` package. With only Bedrock selected the field then is
 * the exact name of the Bedrock policy.
 */
export function getBareNamePackage(packageNames: Iterable<string>): string {
  const unique = new Set(packageNames);
  return unique.size === 1 ? [...unique][0] : AWS_MAIN_PACKAGE_NAME;
}

/**
 * What follows the integration name for a stem (`<package>` or `<package>__<namespace>`): nothing
 * for the bare-name package in the default namespace, its namespace for that package otherwise,
 * and `<package>[-<namespace>]` for the other packages.
 */
function suffixFromStem(stem: string, packageName: string, bareNamePackage: string): string {
  return packageName === bareNamePackage
    ? stem.slice(packageName.length).replace(/^__/, '')
    : stem.replace('__', '-');
}

function policyNameFromStem(
  base: string,
  stem: string,
  packageName: string,
  bareNamePackage: string
): string {
  const suffix = suffixFromStem(stem, packageName, bareNamePackage);
  return suffix ? `${base}-${suffix}` : base;
}

/**
 * Package policy name for a deploy group, derived from the integration name the user entered.
 *
 * - Bundled originals of the bare-name package (`aws`, or the only package of the deploy) keep the
 *   name as entered; a non-default namespace adds `-<namespace>`.
 * - Bundled originals of any other package get `-<package>` (and `-<namespace>`), so the policies
 *   of one deploy never collide.
 * - A duplicate keeps the service name the user chose in the duplicate modal, which is prefilled
 *   with `<name of the policy it was copied from> [Duplicate]` (see `getSourcePolicyName`).
 *
 * Returns undefined without an integration name, so callers keep their previous naming.
 */
export function deriveGroupPolicyName(
  group: DeployGroup,
  integrationName: string | undefined
): string | undefined {
  const base = integrationName?.trim();
  if (!base) return undefined;

  const { packageName } = group.members[0].service;
  if (group.isDuplicateGroup) {
    const name = group.members[0].instance.name.trim();
    return name ? name.slice(0, MAX_POLICY_NAME_LENGTH) : undefined;
  }

  const suffix =
    group.policyNameSuffix ??
    suffixFromStem(
      buildGroupPolicyNameStem(group),
      packageName,
      group.bareNamePackage ?? AWS_MAIN_PACKAGE_NAME
    );
  return (suffix ? `${base}-${suffix}` : base).slice(0, MAX_POLICY_NAME_LENGTH);
}

/**
 * The policy name an original instance of a service gets, from the integration name and the
 * instance's namespace. The duplicate modal uses it to suggest a duplicate's name.
 */
export function getSourcePolicyName(
  integrationName: string,
  packageName: string,
  namespace?: string,
  bareNamePackage: string = AWS_MAIN_PACKAGE_NAME
): string {
  const groupId =
    namespace && namespace !== DEFAULT_NAMESPACE ? `${packageName}__${namespace}` : packageName;
  return policyNameFromStem(
    integrationName.trim(),
    sanitizeGroupId(groupId),
    packageName,
    bareNamePackage
  ).slice(0, MAX_POLICY_NAME_LENGTH);
}

function instanceNamespace(
  instance: ServiceInstance,
  storedServiceVars: Record<string, ServiceVars>
): string {
  return storedServiceVars[instance.instanceId]?.namespace ?? '';
}

/**
 * Group originals by packageName and namespace, and make each duplicate its own group.
 *
 * - Originals (isDuplicate: false): bundled per package and namespace into a DeployGroup so that
 *   all services of the same package sharing a namespace use a single policy call. A policy has
 *   one namespace, so instances with different namespaces cannot share one.
 * - Duplicates (isDuplicate: true): one DeployGroup each, because duplicate instances share the
 *   same stream key inside buildPackageInputs and would silently overwrite each other if bundled.
 */
export function groupByPackage(
  originals: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>,
  duplicates: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>,
  storedServiceVars: Record<string, ServiceVars> = {},
  /**
   * The namespace the deploy gives an instance that has none. When set, an empty namespace and an
   * explicit one equal to it are the same namespace and share a group (and so a policy);
   * otherwise they stay apart, as for agent-based, where an empty namespace means the namespace
   * of the agent policy.
   */
  defaultNamespace?: string
): DeployGroup[] {
  const resolveNamespace = (instance: ServiceInstance) => {
    const namespace = instanceNamespace(instance, storedServiceVars);
    return namespace || defaultNamespace || '';
  };
  const bundled = new Map<
    string,
    {
      namespace: string;
      members: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>;
    }
  >();
  for (const member of originals) {
    const pkg = member.service.packageName;
    const namespace = resolveNamespace(member.instance);
    // The default namespace keeps the plain package id, so policy names do not change.
    const groupId = namespace && namespace !== defaultNamespace ? `${pkg}__${namespace}` : pkg;
    const group = bundled.get(groupId) ?? { namespace, members: [] };
    group.members.push(member);
    bundled.set(groupId, group);
  }

  const groups: DeployGroup[] = [];
  const bareNamePackage = getBareNamePackage(
    [...originals, ...duplicates].map(({ service }) => service.packageName)
  );
  // Sanitizing is lossy (`prod.eu` and `prod_eu` both become `prod_eu`) and groups deploy in the
  // same millisecond, so a counter keeps the name stems of one deploy distinct.
  const usedStems = new Set<string>();
  const usedSuffixes = new Set<string>();
  for (const [groupId, { namespace, members }] of bundled) {
    const baseStem = sanitizeGroupId(groupId);
    let policyNameStem = baseStem;
    for (let n = 2; usedStems.has(policyNameStem); n++) policyNameStem = `${baseStem}_${n}`;
    usedStems.add(policyNameStem);
    // Different packages and namespaces can still spell the same suffix (an `aws` group in
    // namespace `aws_bedrock` next to an `aws_bedrock` group), so the final names are made unique
    // too, not just the stems.
    const packageName = members[0].service.packageName;
    const baseSuffix = suffixFromStem(policyNameStem, packageName, bareNamePackage);
    let policyNameSuffix = baseSuffix;
    for (let n = 2; policyNameSuffix && usedSuffixes.has(policyNameSuffix); n++) {
      policyNameSuffix = `${baseSuffix}_${n}`;
    }
    usedSuffixes.add(policyNameSuffix);
    groups.push({
      groupId,
      instanceIds: members.map(({ instance }) => instance.instanceId),
      members,
      isDuplicateGroup: false,
      namespace,
      policyNameStem,
      policyNameSuffix,
      bareNamePackage,
    });
  }

  for (const member of duplicates) {
    groups.push({
      groupId: member.instance.instanceId,
      instanceIds: [member.instance.instanceId],
      members: [member],
      isDuplicateGroup: true,
      namespace: resolveNamespace(member.instance),
      bareNamePackage,
    });
  }

  return groups;
}

export interface GroupDeployOutcome {
  policyId?: string;
}

/**
 * Collect the settled results of Promise.allSettled deploy calls into per-instance maps.
 *
 * Works with any group type that has `instanceIds: string[]` — both DeployGroup (agentless) and
 * any future agent-based grouping.
 */
export function collectDeployResults<G extends { instanceIds: string[] }>(
  results: PromiseSettledResult<GroupDeployOutcome>[],
  groups: G[]
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
      if (result.value.policyId) {
        for (const instanceId of group.instanceIds) {
          policyIdsByInstance[instanceId] = result.value.policyId;
        }
      }
    } else {
      const errorMsg = extractErrorMessage(result.reason);
      for (const instanceId of group.instanceIds) {
        failedInstances.push(instanceId);
        errorsByInstance[instanceId] = errorMsg;
      }
    }
  }

  return { policyIdsByInstance, failedInstances, errorsByInstance };
}
