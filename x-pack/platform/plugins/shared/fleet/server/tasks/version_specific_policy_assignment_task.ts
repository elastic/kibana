/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { escapeQuotes } from '@kbn/es-query';
import { coerce } from 'semver';
import pMap from 'p-map';

import type { AgentPolicy } from '../../common/types';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../constants';
import { agentPolicyService, appContextService, packagePolicyService } from '../services';
import { getPackageInfo } from '../services/epm/packages';
import { getAgentTemplateAssetsMap } from '../services/epm/packages/get';
import {
  buildVariantAgentsKuery,
  deleteVersionSpecificFleetServerPolicies,
  deleteVersionSpecificFleetServerPoliciesForVersions,
  getAgentCountsForVariantPolicyIds,
  getAgentVersionsForVersionSpecificPolicies,
  hasAgentVersionConditionInInputTemplate,
} from '../services/utils/version_specific_policies';
import { fetchAllAgentsByKuery, getAgentsByKuery } from '../services/agents';
import { reassignAgents } from '../services/agents/reassign';
import {
  splitVersionSuffixFromPolicyId,
  buildVersionVariantsKueryFragment,
} from '../../common/services/version_specific_policies_utils';
import { AGENT_POLICY_INDEX, AGENT_POLICY_VERSION_SEPARATOR } from '../../common/constants';

import { throwIfAborted } from './utils';

export const TYPE = 'fleet:version-specific-policy-assignment-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet version specific policy assignment';
const SCOPE = ['fleet'];
const DEFAULT_INTERVAL = '1m';
const TIMEOUT = '5m';
const AGENT_POLICIES_BATCHSIZE = 500;
const AGENTS_BATCHSIZE = 1000;
const MAX_CONCURRENT_REASSIGNMENTS = 5;
// Time window to look for recently upgraded agents
const RECENTLY_UPGRADED_WINDOW_MINUTES = 30;
// Upper bound on the number of distinct version-specific policy ids we inspect for orphaned agents
// in a single run. Far above any realistic deployment; a safety valve against unbounded aggregations.
const MAX_VERSION_SPECIFIC_POLICY_BUCKETS = 10000;
// A variant whose .fleet-policies document was written within this window is considered "fresh" and
// is never deleted, even if no agents are assigned to it right now. This atomically closes the
// race with a concurrent deployPolicies call: any racing write stamps a fresh @timestamp
// (agent_policy.ts:1946), which the deleteByQuery range filter excludes without a TOCTOU window.
const STALE_VARIANT_GRACE_MS = 60 * 60 * 1000; // 1 hour

interface VersionSpecificPolicyAssignmentTaskConfig {
  taskInterval?: string;
}

interface VersionSpecificPolicyAssignmentTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  config: VersionSpecificPolicyAssignmentTaskConfig;
}

interface VersionSpecificPolicyAssignmentTaskStartContract {
  taskManager: TaskManagerStartContract;
}

interface AgentVersionGroup {
  minorVersion: string;
  agentPolicyId: string;
  agentIds: string[];
}

export class VersionSpecificPolicyAssignmentTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private taskInterval: string;

  constructor(setupContract: VersionSpecificPolicyAssignmentTaskSetupContract) {
    const { core, taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.taskInterval = config.taskInterval ?? DEFAULT_INTERVAL;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({
          taskInstance,
          signal,
        }: {
          taskInstance: ConcreteTaskInstance;
          signal: AbortSignal;
        }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core, signal);
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: VersionSpecificPolicyAssignmentTaskStartContract) => {
    if (!taskManager) {
      this.logger.error(
        '[VersionSpecificPolicyAssignmentTask] Missing required service during start'
      );
      return;
    }

    this.wasStarted = true;
    this.logger.debug(
      `[VersionSpecificPolicyAssignmentTask] Started with interval of [${this.taskInterval}]`
    );

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: this.taskInterval,
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(
        `Error scheduling task VersionSpecificPolicyAssignmentTask, error: ${e.message}`,
        e
      );
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  public runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    signal: AbortSignal
  ) => {
    if (!appContextService.getExperimentalFeatures().enableVersionSpecificPolicies) {
      this.logger.debug(
        '[VersionSpecificPolicyAssignmentTask] Aborting runTask: version specific policies feature is disabled'
      );
      return;
    }

    if (!this.wasStarted) {
      this.logger.debug(
        '[VersionSpecificPolicyAssignmentTask] Aborting runTask(): task not started yet'
      );
      return;
    }

    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[VersionSpecificPolicyAssignmentTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.debug('[VersionSpecificPolicyAssignmentTask] runTask() started');

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

    try {
      // Track which variant policy ids Phase 1 deployed this run so Phase 2 does not delete
      // them: Phase 1 skips agents already correctly assigned, so a wrongly-deleted variant is
      // never recreated and the agent stays stranded on a missing policy permanently.
      const deployedThisRun = new Set<string>();
      await this.processAgentPoliciesWithVersionConditions(
        esClient,
        soClient,
        signal,
        deployedThisRun
      );
      await this.reassignAgentsFromOrphanedVersionSpecificPolicies(
        esClient,
        soClient,
        signal,
        deployedThisRun
      );
      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(
          `[VersionSpecificPolicyAssignmentTask] Request aborted due to timeout: ${err}`
        );
        this.endRun();
        return;
      }
      this.logger.error(`[VersionSpecificPolicyAssignmentTask] Error: ${err}`);
      this.endRun('error');
    }
  };

  private endRun(msg: string = '') {
    this.logger.debug(
      `[VersionSpecificPolicyAssignmentTask] runTask() ended${msg ? ': ' + msg : ''}`
    );
  }

  /**
   * Fetches all agent policies with has_agent_version_conditions flag and processes them
   */
  private async processAgentPoliciesWithVersionConditions(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    signal: AbortSignal,
    deployedThisRun: Set<string>
  ) {
    // Fetch agent policies with version conditions in batches
    const agentPolicyFetcher = await agentPolicyService.fetchAllAgentPolicies(soClient, {
      kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.has_agent_version_conditions:true`,
      perPage: AGENT_POLICIES_BATCHSIZE,
      fields: ['id'],
      spaceId: '*',
    });

    for await (const agentPolicyPageResults of agentPolicyFetcher) {
      this.logger.debug(
        `[VersionSpecificPolicyAssignmentTask] Found ${agentPolicyPageResults.length} agent policies with version conditions`
      );

      if (!agentPolicyPageResults.length) {
        this.endRun('Found no agent policies to process');
        return;
      }

      for (const agentPolicy of agentPolicyPageResults) {
        throwIfAborted(signal);
        await this.processAgentPolicyForVersionAssignment(
          esClient,
          soClient,
          agentPolicy,
          signal,
          deployedThisRun
        );
      }
    }
  }

  /**
   * Process a single agent policy to find and reassign agents to version-specific policies
   */
  private async processAgentPolicyForVersionAssignment(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentPolicy: AgentPolicy,
    signal: AbortSignal,
    deployedThisRun: Set<string>
  ) {
    this.logger.debug(
      `[VersionSpecificPolicyAssignmentTask] Processing agent policy ${agentPolicy.id}`
    );

    // Find agents that need reassignment to version-specific policies
    const agentVersionGroups = await this.findAgentsNeedingVersionSpecificPolicies(
      esClient,
      soClient,
      agentPolicy.id,
      signal
    );

    if (agentVersionGroups.length === 0) {
      this.logger.debug(
        `[VersionSpecificPolicyAssignmentTask] No agents need reassignment for policy ${agentPolicy.id}`
      );
      return;
    }

    // Create version-specific policies and reassign agents
    await this.createVersionPoliciesAndReassignAgents(
      esClient,
      soClient,
      agentPolicy.id,
      agentVersionGroups,
      signal,
      deployedThisRun
    );
  }

  /**
   * Find agents that need to be assigned/reassigned to version-specific policies
   *
   * Criteria:
   * 1. Agents on parent policy (newly enrolled) that need versioned policy
   * 2. Agents on versioned policy but upgraded to a different version (recently upgraded)
   *
   * Note: Agents already on the correct versioned policy but with outdated revisions
   * do NOT need reassignment - they will receive policy updates automatically through
   * fleet-server after deployPolicies updates .fleet-policies.
   */
  private async findAgentsNeedingVersionSpecificPolicies(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentPolicyId: string,
    signal: AbortSignal
  ): Promise<AgentVersionGroup[]> {
    const agentsByMinorVersion = new Map<string, string[]>();

    // Build the kuery to find agents needing reassignment:
    // 1. Agents on the parent policy (not a versioned policy)
    // 2. Agents that were recently upgraded
    // 3. Agents on versioned policy with mismatched version or outdated revision
    const recentlyUpgradedTime = new Date(
      Date.now() - RECENTLY_UPGRADED_WINDOW_MINUTES * 60 * 1000
    ).toISOString();

    // Query 1: Agents on parent policy (newly enrolled or need initial assignment)
    const parentPolicyKuery = `policy_id:"${escapeQuotes(agentPolicyId)}"`;

    // Query 2: Agents on any versioned policy derived from this parent that:
    //   - Were recently upgraded (version might have changed)
    //   - May need to move to a different versioned policy
    const versionedPolicyKuery = `${buildVersionVariantsKueryFragment(
      agentPolicyId
    )} AND upgraded_at >= "${recentlyUpgradedTime}"`;

    // Note: We intentionally do NOT query for agents with outdated policy revisions.
    // Agents already on the correct versioned policy will receive updated revisions
    // automatically through fleet-server after deployPolicies updates .fleet-policies.

    const combinedKuery = `(${parentPolicyKuery}) OR (${versionedPolicyKuery})`;

    this.logger.debug(
      `[VersionSpecificPolicyAssignmentTask] Searching for agents with kuery: ${combinedKuery}`
    );

    // First, check if there are any agents matching our criteria
    const { total } = await getAgentsByKuery(esClient, soClient, {
      kuery: combinedKuery,
      showInactive: false,
      perPage: 0,
    });

    if (total === 0) {
      return [];
    }

    this.logger.debug(
      `[VersionSpecificPolicyAssignmentTask] Found ${total} agents that may need version-specific policy assignment`
    );

    // Fetch agents and group by minor version
    const agentsFetcher = await fetchAllAgentsByKuery(esClient, soClient, {
      kuery: combinedKuery,
      perPage: AGENTS_BATCHSIZE,
      showInactive: false,
    });

    for await (const agentsBatch of agentsFetcher) {
      throwIfAborted(signal);

      for (const agent of agentsBatch) {
        const agentVersion = agent.agent?.version;
        if (!agentVersion) {
          continue;
        }

        const minorVersion = this.extractMinorVersion(agentVersion);
        if (!minorVersion) {
          continue;
        }

        // Check if agent is already on the correct versioned policy for its version
        const currentPolicyId = agent.policy_id;
        if (currentPolicyId) {
          const { baseId, version: policyVersion } =
            splitVersionSuffixFromPolicyId(currentPolicyId);

          // If agent is on a versioned policy with matching version, skip.
          // We don't check policy_revision here - agents with outdated revisions
          // will receive updates automatically through fleet-server after deployPolicies.
          if (policyVersion === minorVersion && baseId === agentPolicyId) {
            continue;
          }
        }

        // Group agent by minor version
        const existingGroup = agentsByMinorVersion.get(minorVersion);
        if (existingGroup) {
          existingGroup.push(agent.id);
        } else {
          agentsByMinorVersion.set(minorVersion, [agent.id]);
        }
      }
    }

    // Convert map to array of AgentVersionGroup
    const versionGroups: AgentVersionGroup[] = [];
    for (const [minorVersion, agentIds] of agentsByMinorVersion) {
      versionGroups.push({
        minorVersion,
        agentPolicyId,
        agentIds,
      });
    }

    this.logger.debug(
      `[VersionSpecificPolicyAssignmentTask] Grouped agents into ${versionGroups.length} version groups for policy ${agentPolicyId}`
    );

    return versionGroups;
  }

  /**
   * Extract minor version from a full version string (e.g., "9.2.1" -> "9.2")
   */
  private extractMinorVersion(version: string): string | null {
    const coercedVersion = coerce(version);
    if (!coercedVersion) {
      return null;
    }
    return `${coercedVersion.major}.${coercedVersion.minor}`;
  }

  /**
   * Create version-specific policies and reassign agents to them
   */
  private async createVersionPoliciesAndReassignAgents(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    parentPolicyId: string,
    agentVersionGroups: AgentVersionGroup[],
    signal: AbortSignal,
    deployedThisRun: Set<string>
  ) {
    // Deploy the parent policy with version-specific policies for each version found
    const versionsToCreate = agentVersionGroups.map((group) => group.minorVersion);

    this.logger.debug(
      `[VersionSpecificPolicyAssignmentTask] Creating version-specific policies for versions: ${versionsToCreate.join(
        ', '
      )} under parent policy ${parentPolicyId}`
    );

    try {
      // Compile version-specific inputs for package policies with agent version conditions
      const packagePolicies = await packagePolicyService.findAllForAgentPolicy(
        soClient,
        parentPolicyId
      );

      for (const packagePolicy of packagePolicies) {
        if (!packagePolicy.package) {
          continue;
        }

        const pkgInfo = await getPackageInfo({
          savedObjectsClient: soClient,
          pkgName: packagePolicy.package.name,
          pkgVersion: packagePolicy.package.version,
        });

        const assetsMap = await getAgentTemplateAssetsMap({
          logger: this.logger,
          packageInfo: pkgInfo,
          savedObjectsClient: soClient,
        });

        if (hasAgentVersionConditionInInputTemplate(assetsMap)) {
          this.logger.debug(
            `[VersionSpecificPolicyAssignmentTask] Compiling version-specific inputs for package policy ${packagePolicy.id}`
          );
          await packagePolicyService.compilePackagePolicyForVersions(
            soClient,
            pkgInfo,
            assetsMap,
            packagePolicy,
            versionsToCreate
          );
        }
      }

      // Deploy the agent policy with specific versions
      // This will create the version-specific policies in .fleet-policies index
      await agentPolicyService.deployPolicies(soClient, [parentPolicyId], undefined, {
        agentVersions: versionsToCreate,
      });
      // Record every variant deployed this run so Phase 2 does not delete them: Phase 1 skips
      // agents already on the correct variant, so a wrongly-deleted variant is never recreated
      // and the agent stays stranded on a missing policy permanently.
      for (const version of versionsToCreate) {
        deployedThisRun.add(`${parentPolicyId}${AGENT_POLICY_VERSION_SEPARATOR}${version}`);
      }

      // Reassign agents to their version-specific policies
      await pMap(
        agentVersionGroups,
        async (versionGroup) => {
          throwIfAborted(signal);
          await this.reassignAgentsToVersionedPolicy(esClient, soClient, versionGroup, signal);
        },
        {
          concurrency: MAX_CONCURRENT_REASSIGNMENTS,
        }
      );
    } catch (error) {
      this.logger.error(
        `[VersionSpecificPolicyAssignmentTask] Error creating version-specific policies for ${parentPolicyId}: ${error}`
      );
    }
  }

  /**
   * Reassign agents in a version group to their target versioned policy
   */
  private async reassignAgentsToVersionedPolicy(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    versionGroup: AgentVersionGroup,
    signal: AbortSignal
  ) {
    const { minorVersion, agentPolicyId, agentIds } = versionGroup;
    const targetPolicyId = `${agentPolicyId}${AGENT_POLICY_VERSION_SEPARATOR}${minorVersion}`;

    this.logger.debug(
      `[VersionSpecificPolicyAssignmentTask] Reassigning ${agentIds.length} agents to versioned policy ${targetPolicyId}`
    );

    try {
      await reassignAgents(
        soClient,
        esClient,
        {
          agentIds,
          showInactive: false,
        },
        targetPolicyId
      );

      this.logger.debug(
        `[VersionSpecificPolicyAssignmentTask] Successfully reassigned agents to ${targetPolicyId}`
      );
    } catch (error) {
      this.logger.error(
        `[VersionSpecificPolicyAssignmentTask] Error reassigning agents to ${targetPolicyId}: ${error}`
      );
    }
  }

  /**
   * Reconcile version-specific (variant) `.fleet-policies` documents against the set of versions
   * that actually need them. Two cases:
   *
   * 1. Parent has `has_agent_version_conditions: false` (or the policy was deleted): all variant
   *    documents are stale. Reassign any remaining agents back to the base policy, then delete all
   *    variant documents. This is the pre-existing path, unchanged.
   *
   * 2. Parent still has `has_agent_version_conditions: true`: the parent is healthy but individual
   *    per-version variants may have become stale (e.g. `#9.2` once Kibana moved on and every
   *    enrolled agent upgraded). Delete variants that are outside the default bounded set AND have
   *    zero agents assigned, subject to a grace window so any racing deploy is not caught mid-flight.
   *    See https://github.com/elastic/kibana/issues/283077 (Half A).
   */
  private async reassignAgentsFromOrphanedVersionSpecificPolicies(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    signal: AbortSignal,
    deployedThisRun: Set<string>
  ) {
    // Enumerate the distinct policy ids present in `.fleet-policies` via a terms aggregation with a
    // max(@timestamp) sub-aggregation. Driving from .fleet-policies is cheaper than scanning
    // .fleet-agents (one set of docs per policy, not per agent) and correctly cleans up variants
    // even after every agent has moved off them.
    const policiesResponse = await esClient.search<
      unknown,
      {
        variant_policies: {
          buckets: Array<{ key: string; last_written: { value: number | null } }>;
          sum_other_doc_count: number;
        };
      }
    >({
      index: AGENT_POLICY_INDEX,
      ignore_unavailable: true,
      size: 0,
      aggs: {
        variant_policies: {
          terms: { field: 'policy_id', size: MAX_VERSION_SPECIFIC_POLICY_BUCKETS },
          aggs: {
            last_written: { max: { field: '@timestamp' } },
          },
        },
      },
    });

    const variantPoliciesAgg = policiesResponse.aggregations?.variant_policies;
    const buckets = variantPoliciesAgg?.buckets ?? [];
    if (buckets.length === 0) {
      return;
    }
    if (variantPoliciesAgg?.sum_other_doc_count) {
      this.logger.warn(
        `[VersionSpecificPolicyAssignmentTask] More than ${MAX_VERSION_SPECIFIC_POLICY_BUCKETS} policies in .fleet-policies; some version-specific policies will be checked for orphaned assignments on a later run`
      );
    }

    // Partition buckets into variant vs base, preserving last-written timestamp.
    interface VariantBucket {
      policyId: string;
      baseId: string;
      version: string;
      lastWritten: number;
    }
    const variantBuckets: VariantBucket[] = [];
    const basePolicyIdSet = new Set<string>();
    for (const bucket of buckets) {
      const { baseId, version } = splitVersionSuffixFromPolicyId(bucket.key);
      if (version === null) continue;
      variantBuckets.push({
        policyId: bucket.key,
        baseId,
        version,
        lastWritten: bucket.last_written.value ?? 0,
      });
      basePolicyIdSet.add(baseId);
    }
    if (variantBuckets.length === 0) {
      return;
    }

    const basePolicyIds = [...basePolicyIdSet];
    const parentPolicies = await agentPolicyService.getByIds(
      soClient,
      basePolicyIds.map((id) => ({ id, spaceId: '*' })),
      { fields: ['id', 'has_agent_version_conditions'], ignoreMissing: true }
    );
    const parentPoliciesById = new Map(parentPolicies.map((p) => [p.id, p]));

    // Split parents into the two cases.
    const noConditionParentIds = new Set<string>();
    const withConditionParentIds = new Set<string>();
    for (const id of basePolicyIds) {
      const parent = parentPoliciesById.get(id);
      if (!parent) continue; // deleted policy — handled by the agent policy deletion flow
      if (parent.has_agent_version_conditions) {
        withConditionParentIds.add(id);
      } else {
        noConditionParentIds.add(id);
      }
    }

    // Case 1: parent no longer has version conditions — reassign all agents and delete all variants.
    if (noConditionParentIds.size > 0) {
      this.logger.debug(
        `[VersionSpecificPolicyAssignmentTask] Found ${noConditionParentIds.size} agent policies with orphaned version-specific assignments to clean up`
      );
      for (const parentPolicyId of noConditionParentIds) {
        throwIfAborted(signal);
        await this.reassignOrphanedAgentsToBasePolicy(esClient, soClient, parentPolicyId, signal);
      }
    }

    // Case 2: parent still has version conditions but individual variants may be stale.
    if (withConditionParentIds.size > 0) {
      throwIfAborted(signal);
      await this.deleteStaleVariantsForActiveParents(
        esClient,
        soClient,
        variantBuckets.filter((b) => withConditionParentIds.has(b.baseId)),
        deployedThisRun,
        signal
      );
    }
  }

  /**
   * For parent policies that still have `has_agent_version_conditions: true`, delete any variant
   * documents that are outside the default bounded set AND have zero agents assigned AND were last
   * written more than STALE_VARIANT_GRACE_MS ago. See https://github.com/elastic/kibana/issues/283077
   */
  private async deleteStaleVariantsForActiveParents(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    variantBuckets: Array<{
      policyId: string;
      baseId: string;
      version: string;
      lastWritten: number;
    }>,
    deployedThisRun: Set<string>,
    signal: AbortSignal
  ) {
    const boundedSet = new Set(await getAgentVersionsForVersionSpecificPolicies());
    const now = Date.now();
    const writtenBeforeThreshold = now - STALE_VARIANT_GRACE_MS;

    // Filter to candidates: outside the bounded set, not deployed this run, and older than GRACE.
    const candidates = variantBuckets.filter(
      (b) =>
        !boundedSet.has(b.version) &&
        !deployedThisRun.has(b.policyId) &&
        b.lastWritten < writtenBeforeThreshold
    );
    if (candidates.length === 0) {
      return;
    }

    // Check which candidates actually have agents (including inactive) to avoid deleting a variant
    // an agent still references. The @timestamp range in the deleteByQuery also closes this race
    // atomically, but the pre-check avoids the ES write for the common case where agents remain.
    const candidatePolicyIds = candidates.map((c) => c.policyId);
    const agentCounts = await getAgentCountsForVariantPolicyIds(esClient, candidatePolicyIds);

    const toDelete = candidates
      .filter((c) => (agentCounts.get(c.policyId) ?? 0) === 0)
      .map((c) => c.policyId);

    if (toDelete.length === 0) {
      return;
    }

    this.logger.info(
      `[VersionSpecificPolicyAssignmentTask] Deleting ${
        toDelete.length
      } stale version-specific variant document(s) for active parents: ${toDelete.join(', ')}`
    );

    throwIfAborted(signal);
    const writtenBefore = new Date(writtenBeforeThreshold).toISOString();
    await deleteVersionSpecificFleetServerPoliciesForVersions(esClient, toDelete, {
      writtenBefore,
    });

    // Self-heal: re-check the deleted ids for agents in case a new agent was just assigned.
    // If any survived, immediately redeploy the variant so the agent is not stranded permanently.
    const postDeleteCounts = await getAgentCountsForVariantPolicyIds(esClient, toDelete);
    const toRedeploy = toDelete.filter((id) => (postDeleteCounts.get(id) ?? 0) > 0);
    if (toRedeploy.length > 0) {
      this.logger.warn(
        `[VersionSpecificPolicyAssignmentTask] ${
          toRedeploy.length
        } deleted variant(s) have agents after deletion (race); redeploying: ${toRedeploy.join(
          ', '
        )}`
      );
      // Group by base policy id and redeploy the affected versions.
      const byParent = new Map<string, string[]>();
      for (const policyId of toRedeploy) {
        const { baseId, version } = splitVersionSuffixFromPolicyId(policyId);
        if (version === null) continue;
        if (!byParent.has(baseId)) byParent.set(baseId, []);
        byParent.get(baseId)!.push(version);
      }
      for (const [parentId, versions] of byParent) {
        throwIfAborted(signal);
        try {
          await agentPolicyService.deployPolicies(soClient, [parentId], undefined, {
            agentVersions: versions,
          });
        } catch (err) {
          this.logger.error(
            `[VersionSpecificPolicyAssignmentTask] Error redeploying variant(s) for ${parentId}: ${err}`
          );
        }
      }
    }
  }

  /**
   * Reassign every agent still on a variant policy of the given parent back to the base policy
   * (across all spaces, by agent id), then delete the now-stale variant `.fleet-policies` documents.
   */
  private async reassignOrphanedAgentsToBasePolicy(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    parentPolicyId: string,
    signal: AbortSignal
  ) {
    try {
      const variantAgentsKuery = buildVariantAgentsKuery(parentPolicyId);

      const agentIds: string[] = [];
      // Include inactive agents: reassignment is a metadata update on `.fleet-agents` that is valid
      // regardless of active status. Skipping them would delete the variant documents below while an
      // inactive agent still references one, leaving it stuck on a missing policy when it reactivates.
      const agentsFetcher = await fetchAllAgentsByKuery(esClient, soClient, {
        kuery: variantAgentsKuery,
        perPage: AGENTS_BATCHSIZE,
        showInactive: true,
      });
      for await (const agentsBatch of agentsFetcher) {
        throwIfAborted(signal);
        for (const agent of agentsBatch) {
          agentIds.push(agent.id);
        }
      }

      if (agentIds.length > 0) {
        this.logger.info(
          `[VersionSpecificPolicyAssignmentTask] Reassigning ${agentIds.length} orphaned agents from version-specific policies of ${parentPolicyId} back to the base policy`
        );
        // Reassign by agent id (not kuery) so agents in every space are covered — the task runs
        // with a space-agnostic saved objects client.
        await reassignAgents(soClient, esClient, { agentIds, showInactive: true }, parentPolicyId);

        // bulkUpdateAgents collects per-agent ES errors without throwing, so reassignAgents
        // returns { actionId } even if some updates silently failed (e.g. retry_on_conflict
        // exhausted under heavy check-in churn). Re-check the count before deleting variant docs:
        // if any agents remain on the variant, skip deletion so the next sweep run can retry.
        const { total: remaining } = await getAgentsByKuery(esClient, soClient, {
          kuery: variantAgentsKuery,
          showInactive: true,
          perPage: 0,
        });
        if (remaining > 0) {
          this.logger.warn(
            `[VersionSpecificPolicyAssignmentTask] ${remaining} agent(s) still on variant policies of ${parentPolicyId} after reassignment (bulk update may have partially failed); skipping variant doc deletion so the next sweep run can retry`
          );
          return;
        }
      }

      // All agents have been moved off the variant policies (or there were none to move).
      // Safe to remove the now-stale variant documents.
      await deleteVersionSpecificFleetServerPolicies(esClient, parentPolicyId);
    } catch (error) {
      this.logger.error(
        `[VersionSpecificPolicyAssignmentTask] Error reassigning orphaned agents from version-specific policies of ${parentPolicyId}: ${error}`
      );
    }
  }
}
