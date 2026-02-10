/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { CliOptions } from './types';
import { createElasticAgentPolicy } from './lib/create_agent_policy';
import { fetchAgentPolicyEnrollmentToken } from './lib/fetch_agent_policy_enrollment_token';
import { enrollAgent } from './lib/enroll_agent';
import { createPrivateLocation } from './lib/create_private_location';
import { KibanaAPIClient } from './lib/kibana_api_client';

export async function run(options: CliOptions, logger: ToolingLog) {
  const kibanaClient = new KibanaAPIClient(
    options.kibanaUrl,
    options.kibanaUsername,
    options.kibanaPassword,
    logger
  );

  if (options.policySharding) {
    await runPolicySharding(options, logger, kibanaClient);
  } else {
    await runDefault(options, logger, kibanaClient);
  }
}

async function runDefault(options: CliOptions, logger: ToolingLog, kibanaClient: KibanaAPIClient) {
  const {
    item: { id: agentPolicyId },
  } = await createElasticAgentPolicy(options, logger, kibanaClient);
  await createPrivateLocation(options, logger, kibanaClient, agentPolicyId);
  const { list } = await fetchAgentPolicyEnrollmentToken(
    options,
    logger,
    kibanaClient,
    agentPolicyId
  );
  const [enrollmentTokenConfig] = list;
  const { api_key: enrollmentToken } = enrollmentTokenConfig;
  enrollAgent(options, enrollmentToken, kibanaClient, {}, logger);
}

async function runPolicySharding(
  options: CliOptions,
  logger: ToolingLog,
  kibanaClient: KibanaAPIClient
) {
  const numPolicies = options.numPolicies ?? 3;
  logger.info(`Policy sharding mode: creating ${numPolicies} agent policies`);

  const agentPolicyIds: string[] = [];
  for (let i = 0; i < numPolicies; i++) {
    const policyOptions = {
      ...options,
      agentPolicyName: `${options.agentPolicyName} shard-${i + 1}`,
    };
    const {
      item: { id: agentPolicyId },
    } = await createElasticAgentPolicy(policyOptions, logger, kibanaClient);
    agentPolicyIds.push(agentPolicyId);
    logger.info(`Created agent policy shard-${i + 1}: ${agentPolicyId}`);
  }

  const [primaryPolicyId, ...additionalPolicyIds] = agentPolicyIds;
  await createPrivateLocation(options, logger, kibanaClient, primaryPolicyId, additionalPolicyIds);
  logger.info(
    `Private location created with ${numPolicies} agent policies: ${agentPolicyIds.join(', ')}`
  );

  logger.info(`Enrolling ${numPolicies} agents (one per policy)...`);
  for (let i = 0; i < agentPolicyIds.length; i++) {
    const policyId = agentPolicyIds[i];
    const shardName = `synthetics-shard-${i + 1}`;
    logger.info(`Enrolling agent "${shardName}" for policy shard-${i + 1} (${policyId})...`);
    const { list } = await fetchAgentPolicyEnrollmentToken(options, logger, kibanaClient, policyId);
    const [enrollmentTokenConfig] = list;
    const { api_key: enrollmentToken } = enrollmentTokenConfig;
    await enrollAgent(
      options,
      enrollmentToken,
      kibanaClient,
      { containerName: shardName, skipFleetServer: i > 0 },
      logger
    );
    logger.info(`Agent "${shardName}" enrolled for policy shard-${i + 1}`);
  }

  logger.info(`Policy sharding setup complete: ${numPolicies} policies, ${numPolicies} agents`);
}
