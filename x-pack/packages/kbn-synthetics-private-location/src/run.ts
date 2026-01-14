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
  const {
    item: { id: agentPolicyId },
  } = await createElasticAgentPolicy(options, logger, kibanaClient);
  const privateLocationResponse = await createPrivateLocation(
    options,
    logger,
    kibanaClient,
    agentPolicyId
  );

  // Output private location ID for use with synthetics_forge
  logger.info('');
  logger.info('════════════════════════════════════════════════════════════════');
  logger.info('  SYNTHETICS PRIVATE LOCATION CREATED');
  logger.info('════════════════════════════════════════════════════════════════');
  logger.info(`  Private Location ID:    ${privateLocationResponse.id}`);
  logger.info(`  Private Location Label: ${privateLocationResponse.label}`);
  logger.info(`  Agent Policy ID:        ${agentPolicyId}`);
  logger.info('');
  logger.info('  To use with synthetics_forge:');
  logger.info(`  PRIVATE_LOCATION_ID="${privateLocationResponse.id}"`);
  logger.info('════════════════════════════════════════════════════════════════');
  logger.info('');

  const { list } = await fetchAgentPolicyEnrollmentToken(
    options,
    logger,
    kibanaClient,
    agentPolicyId
  );
  const [enrollmentTokenConfig] = list;
  const { api_key: enrollmentToken } = enrollmentTokenConfig;
  enrollAgent(options, enrollmentToken, kibanaClient);
}
