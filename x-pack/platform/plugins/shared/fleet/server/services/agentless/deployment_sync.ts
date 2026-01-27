/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import pMap from 'p-map';

import type { AgentlessAgentService } from '../agents/agentless_agent';
import { agentPolicyService, appContextService } from '..';

import { AGENT_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../constants';
import { AgentlessAgentListNotFoundError } from '../../errors';

const AGENTLESS_CONCURRENCY = 1;
const PAGE_SIZE = 20;

function dryRunTag(dryRun = false) {
  if (dryRun) {
    return `[Dry Run]`;
  }
  return '';
}

export async function syncAgentlessDeployments(
  {
    logger,
    agentlessAgentService,
  }: {
    logger: Logger;
    agentlessAgentService: AgentlessAgentService;
  },
  opts?: {
    dryRun?: boolean;
    abortController?: AbortController;
  }
) {
  logger.info(`[Agentless Deployment Sync] Starting sync process`);
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  try {
    // retrieve all agentless deployments
    const currentDeployments: Array<{ policy_id: string; revision_idx?: number }> = [];
    let hasMore = true;
    let nextPageToken: string | undefined;

    while (hasMore) {
      if (opts?.abortController?.signal.aborted) {
        throw new Error('Task was aborted');
      }
      const deploymentRes = await agentlessAgentService.listAgentlessDeployments({
        perPage: PAGE_SIZE,
        nextPageToken,
      });
      if (!deploymentRes) {
        return;
      }

      nextPageToken = deploymentRes.next_token;
      if (!nextPageToken) {
        hasMore = false;
      }

      const policyIds = deploymentRes.deployments.map((d) => d.policy_id);
      const agentPolicies = await agentPolicyService.getByIds(soClient, policyIds, {
        spaceId: '*',
        ignoreMissing: true,
      });

      await pMap(
        deploymentRes.deployments,
        async (deployment) => {
          if (opts?.abortController?.signal.aborted) {
            throw new Error('Task was aborted');
          }
          const agentPolicy = agentPolicies.find((ap) => ap.id === deployment.policy_id);

          if (!agentPolicy) {
            logger.info(
              `[Agentless Deployment Sync]${dryRunTag(opts?.dryRun)} Deleting deployment ${
                deployment.policy_id
              }`
            );
            if (!opts?.dryRun) {
              await agentlessAgentService
                .deleteAgentlessAgent(deployment.policy_id)
                .catch((error) => {
                  logger.error(
                    `[Agentless Deployment Sync] Failed to delete deployment ${deployment.policy_id}`,
                    { error }
                  );
                });
            }
          } else if (
            !agentPolicy.keep_monitoring_alive ||
            (agentPolicy.monitoring_enabled?.length ?? 0) > 0
          ) {
            const esClient = appContextService.getInternalUserESClient();
            const spacedScoppedSoClient = appContextService.getInternalUserSOClientForSpaceId(
              agentPolicy.namespace || undefined
            );
            logger.info(
              `[Agentless Deployment Sync]${dryRunTag(
                opts?.dryRun
              )} Updating agentless policy monitoring settings ${agentPolicy.id}`
            );
            await agentPolicyService.update(spacedScoppedSoClient, esClient, agentPolicy.id, {
              // Ensure agentless policies keep monitoring alive so http monitoring server continue to work even without monitoring enabled
              keep_monitoring_alive: true,
              monitoring_enabled: [],
            });
          } else if (
            deployment.revision_idx === undefined ||
            deployment.revision_idx < agentPolicy.revision
          ) {
            logger.info(
              `[Agentless Deployment Sync]${dryRunTag(opts?.dryRun)} Updating deployment ${
                deployment.policy_id
              }`
            );
            if (!opts?.dryRun) {
              const spacedScoppedSoClient = appContextService.getInternalUserSOClientForSpaceId(
                agentPolicy.namespace || undefined
              );
              const esClient = appContextService.getInternalUserESClient();
              await agentlessAgentService
                .createAgentlessAgent(esClient, spacedScoppedSoClient, agentPolicy)
                .catch((error) => {
                  logger.error(
                    `[Agentless Deployment Sync] Failed to update deployment ${deployment.policy_id}`,
                    { error }
                  );
                });
            }
          }
        },
        {
          concurrency: AGENTLESS_CONCURRENCY,
        }
      );
      currentDeployments.push(...deploymentRes.deployments);
    }

    const agentlessPolicies = await agentPolicyService.list(soClient, {
      perPage: SO_SEARCH_LIMIT,
      fields: [
        'revision',
        'supports_agentless',
        'global_data_tags',
        'fleet_server_host_id',
        'agentless',
      ],
      kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.supports_agentless:true`,
      spaceId: '*',
    });

    if (opts?.abortController?.signal.aborted) {
      throw new Error('Task was aborted');
    }

    await pMap(
      agentlessPolicies.items,
      async (agentPolicy) => {
        if (opts?.abortController?.signal.aborted) {
          throw new Error('Task was aborted');
        }
        const deployment = currentDeployments.find((d) => d.policy_id === agentPolicy.id);
        if (!deployment) {
          logger.info(
            `[Agentless Deployment Sync]${dryRunTag(opts?.dryRun)} Creating deployment for policy ${
              agentPolicy.id
            }`
          );
          if (!opts?.dryRun) {
            const spacedScoppedSoClient = appContextService.getInternalUserSOClientForSpaceId(
              agentPolicy.namespace || undefined
            );
            const esClient = appContextService.getInternalUserESClient();
            await agentlessAgentService
              .createAgentlessAgent(esClient, spacedScoppedSoClient, agentPolicy)
              .catch((error) => {
                logger.error(
                  `[Agentless Deployment Sync] Failed to create deployment ${agentPolicy.id}`,
                  { error }
                );
              });
          }
        }
      },
      {
        concurrency: AGENTLESS_CONCURRENCY,
      }
    );
    logger.info(`[Agentless Deployment Sync] Finished sync process`);
  } catch (error) {
    if (error instanceof AgentlessAgentListNotFoundError) {
      logger.warn(`[Agentless Deployment Sync] Skipping sync agentless list API not found`, {
        error,
      });
      return;
    }

    logger.error(`[Agentless Deployment Sync] Sync failed with error`, { error });

    throw error;
  }
}
