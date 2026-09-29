/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendCreatePackagePolicy, sendGetPackageInfoByKeyForRq } from '@kbn/fleet-plugin/public';

import type { DeployGroup } from '../deploy_groups';
import { collectDeployResults } from '../deploy_group_helpers';
import { buildGroupPackagePolicy } from './package_policy_body';
import type { BuildPackagePolicyOpts } from './package_policy_body';

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
 * Creates one package policy per group, each reused across all selected agent policies.
 *
 * Uses policy_ids (Fleet's reusable-package-policy feature) so we create N package policies,
 * NOT N×M: one integration config applied to multiple host groups. Each policy is created
 * independently so Promise.allSettled gives per-group error granularity.
 *
 * Bundled originals (multiple services, same package) share one package policy document whose
 * id fans out to all instanceIds in the group via collectDeployResults.
 *
 * namespace is intentionally omitted so each target policy's own namespace applies.
 */
export async function deployToExistingAgentPolicies(
  groups: DeployGroup[],
  opts: DeployToExistingOpts
): Promise<DeployToExistingResult> {
  const { selectedAgentPolicyIds } = opts;

  // Fetch pkg info for all needed packages (usually just 'aws').
  const packageNames = [
    ...new Set(groups.flatMap((g) => g.members.map((m) => m.service.packageName))),
  ];
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
    groups.map(async (group) => {
      const pkgName = group.members[0].service.packageName;
      const pkgVersion = pkgVersionByPackage[pkgName];
      const pkgInfo = pkgInfoByPackage[pkgName];
      const body = await buildGroupPackagePolicy(group, pkgInfo ?? {}, {
        ...opts,
        pkgVersion,
      });

      const response = await sendCreatePackagePolicy({
        ...body,
        policy_ids: selectedAgentPolicyIds,
      } as any);

      return {
        policyId: (response as any)?.item?.id as string | undefined,
      };
    })
  );

  const { policyIdsByInstance, failedInstances, errorsByInstance } = collectDeployResults(
    results,
    groups
  );
  return {
    packagePolicyIdsByInstance: policyIdsByInstance,
    failedInstances,
    errorsByInstance,
  };
}
