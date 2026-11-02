/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sendCreateAgentPolicyWithPackagePolicies,
  sendGetPackageInfoByKeyForRq,
} from '@kbn/fleet-plugin/public';

import type { DeployGroup } from '../deploy_groups';
import { buildGroupPackagePolicy, mapPolicyIdsByName } from './package_policy_body';
import type { BuildPackagePolicyOpts, PkgInfo } from './package_policy_body';
import { buildAgentPolicyName } from './agent_policy_name';

export type { BuildPackagePolicyOpts };
export { buildAgentPolicyName };

interface DeployNewAgentPolicyOpts extends BuildPackagePolicyOpts {
  agentPolicyName: string;
  /** Whether to enable system monitoring on the created agent policy. Defaults to true. */
  withSysMonitoring?: boolean;
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
  groups: DeployGroup[],
  opts: DeployNewAgentPolicyOpts
): Promise<DeployNewAgentPolicyResult> {
  const { agentPolicyName, namespace, withSysMonitoring } = opts;

  // All members in the same package share the same pkgVersion — fetch once per package.
  // In practice all selected AWS services share the aws package, so this is one fetch.
  const packageNames = [
    ...new Set(groups.flatMap((g) => g.members.map((m) => m.service.packageName))),
  ];
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

  const packagePoliciesWithGroups = await Promise.all(
    groups.map(async (group) => {
      const pkgName = group.members[0].service.packageName;
      const pkgVersion = pkgVersionByPackage[pkgName];
      const pkgInfo = pkgInfoByPackage[pkgName];
      const body = await buildGroupPackagePolicy(group, pkgInfo ?? {}, {
        ...opts,
        pkgVersion,
      });
      return { body, group };
    })
  );

  const response = await sendCreateAgentPolicyWithPackagePolicies(
    {
      name: agentPolicyName,
      namespace,
      description: 'Created by AWS onboarding',
      monitoring_enabled: ['logs', 'metrics'],
      package_policies: packagePoliciesWithGroups.map(({ body }) => body),
    },
    withSysMonitoring !== false ? { sys_monitoring: true } : undefined
  );

  const agentPolicyId: string = (response as any).item?.id ?? '';
  const responsePolicies: Array<{ id: string; name: string }> =
    (response as any).item?.package_policies ?? [];

  const byName = mapPolicyIdsByName(responsePolicies);
  const packagePolicyIdsByInstance: Record<string, string> = {};
  for (const { body, group } of packagePoliciesWithGroups) {
    const ppId = byName.get(body.name);
    if (ppId) {
      // Fan the single policy id out across all instanceIds in the group.
      for (const instanceId of group.instanceIds) {
        packagePolicyIdsByInstance[instanceId] = ppId;
      }
    }
  }

  return { agentPolicyId, agentPolicyName, packagePolicyIdsByInstance };
}
