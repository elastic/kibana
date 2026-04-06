/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import chunk from 'lodash/chunk';

import type {
  AggregationsTermsAggregateBase,
  AggregationsStringTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { AGENTS_INDEX, SO_SEARCH_LIMIT } from '../../common';
import { agentPolicyService, getAgentPolicySavedObjectType } from '../services/agent_policy';
import { appContextService, packagePolicyService } from '../services';
import { getPackageInfo } from '../services/epm/packages';
import { getAgentTemplateAssetsMap } from '../services/epm/packages/get';
import { hasAgentVersionConditionInInputTemplate } from '../services/utils/version_specific_policies';
import { AGENT_POLICY_VERSION_SEPARATOR } from '../constants';
import { getPackagePolicySavedObjectType } from '../services/package_policy';

const AGENT_POLICY_IDS_BATCH_SIZE = 100;

export interface AgentOnVersionSpecificPolicy {
  agent_version: string;
  count: number;
}

export interface VersionSpecificPoliciesUsage {
  agent_policies_count: number;
  packages_with_agent_version_conditions: string[];
  agents_on_version_specific_policies_per_version: AgentOnVersionSpecificPolicy[];
}

const DEFAULT_USAGE: VersionSpecificPoliciesUsage = {
  agent_policies_count: 0,
  packages_with_agent_version_conditions: [],
  agents_on_version_specific_policies_per_version: [],
};

export const getVersionSpecificPoliciesUsage = async (
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<VersionSpecificPoliciesUsage> => {
  try {
    const agentPolicySavedObjectType = await getAgentPolicySavedObjectType();

    const agentPolicyFetcher = await agentPolicyService.fetchAllAgentPolicies(soClient, {
      perPage: SO_SEARCH_LIMIT,
      spaceId: '*',
      kuery: `${agentPolicySavedObjectType}.has_agent_version_conditions:true`,
      fields: ['package_agent_version_conditions'],
    });
    const packagesSet = new Set<string>();
    const installedPackages = new Map<string, { name: string; version: string }>();
    let policiesCount = 0;
    const agentPolicyIds: string[] = [];

    const logger = appContextService.getLogger();

    for await (const agentPolicyPageResults of agentPolicyFetcher) {
      if (!agentPolicyPageResults.length) {
        break;
      }
      policiesCount += agentPolicyPageResults.length;
      for (const policy of agentPolicyPageResults) {
        agentPolicyIds.push(policy.id);
        for (const dep of policy.package_agent_version_conditions ?? []) {
          packagesSet.add(dep.name);
        }
      }
    }

    const packagePolicyType = await getPackagePolicySavedObjectType();

    await pMap(
      chunk(agentPolicyIds, AGENT_POLICY_IDS_BATCH_SIZE),
      async (batch) => {
        const kuery = `${packagePolicyType}.policy_ids:(${batch
          .map((id) => `"${id}"`)
          .join(' OR ')})`;
        const { items: packagePolicies } = await packagePolicyService.list(soClient, {
          kuery,
          perPage: SO_SEARCH_LIMIT,
        });
        for (const pp of packagePolicies) {
          if (pp.package?.name && pp.package?.version) {
            installedPackages.set(`${pp.package.name}@${pp.package.version}`, {
              name: pp.package.name,
              version: pp.package.version,
            });
          }
        }
      },
      { concurrency: 1 }
    );

    logger.debug(
      `Found ${policiesCount} agent policies with version conditions, ${installedPackages.size} unique installed package versions to check`
    );

    for (const { name, version } of installedPackages.values()) {
      try {
        const pkgInfo = await getPackageInfo({
          savedObjectsClient: soClient,
          pkgName: name,
          pkgVersion: version,
          prerelease: true,
        });
        const assetsMap = await getAgentTemplateAssetsMap({
          savedObjectsClient: soClient,
          packageInfo: pkgInfo,
          logger,
        });
        if (hasAgentVersionConditionInInputTemplate(assetsMap)) {
          packagesSet.add(name);
          logger.debug(`Package ${name}@${version} has agent version conditions in input template`);
        }
      } catch {
        // ignore — package might not be installed or accessible
      }
    }
    const packagesWithAgentVersionConditions = Array.from(packagesSet);
    logger.debug(
      `Packages with agent version conditions: ${packagesWithAgentVersionConditions.join(', ')}`
    );

    const response = await esClient.search({
      index: AGENTS_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { active: 'true' } },
            { wildcard: { policy_id: `*${AGENT_POLICY_VERSION_SEPARATOR}*` } },
          ],
        },
      },
      aggs: {
        versions: {
          terms: { field: 'agent.version' },
        },
      },
    });

    const agentsOnVersionSpecificPoliciesPerVersion = (
      ((
        response?.aggregations
          ?.versions as AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>
      ).buckets ?? []) as AggregationsStringTermsBucketKeys[]
    ).map((bucket: AggregationsStringTermsBucketKeys) => ({
      agent_version: bucket.key as string,
      count: bucket.doc_count,
    }));
    logger.debug(
      `Agents on version-specific policies per version: ${agentsOnVersionSpecificPoliciesPerVersion
        .map((v: AgentOnVersionSpecificPolicy) => `${v.agent_version}: ${v.count}`)
        .join(', ')}`
    );

    return {
      agent_policies_count: policiesCount,
      packages_with_agent_version_conditions: packagesWithAgentVersionConditions,
      agents_on_version_specific_policies_per_version: agentsOnVersionSpecificPoliciesPerVersion,
    };
  } catch (error) {
    if (error.statusCode === 404) {
      appContextService.getLogger().debug('Index .fleet-agents does not exist yet.');
    } else {
      throw error;
    }
    return DEFAULT_USAGE;
  }
};
