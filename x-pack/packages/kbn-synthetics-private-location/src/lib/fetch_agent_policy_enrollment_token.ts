/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isError } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { KibanaAPIClient } from './kibana_api_client';
import { CliOptions } from '../types';

export async function fetchAgentPolicyEnrollmentToken(
  { kibanaUrl, kibanaPassword, kibanaUsername }: CliOptions,
  logger: ToolingLog,
  kibanaApiClient: KibanaAPIClient,
  agentPolicyId: string
) {
  try {
    const response = await kibanaApiClient.sendRequest({
      method: 'get',
      url: `api/fleet/enrollment_api_keys?kuery=policy_id:${agentPolicyId}`,
    });

    logger.info(`Fetching agent policy enrollment token`);
    return response.data;
  } catch (error) {
    if (isError(error)) {
      logger.error(`Error fetching agent enrollment token: ${error.message} ${error.stack}`);
    }
    throw error;
  }
}
