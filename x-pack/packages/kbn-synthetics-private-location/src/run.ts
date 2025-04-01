/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
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
  await createPrivateLocation(options, logger, kibanaClient, agentPolicyId);
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
