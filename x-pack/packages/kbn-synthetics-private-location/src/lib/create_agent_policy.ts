/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isError } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { CliOptions } from '../types';
import type { KibanaAPIClient } from './kibana_api_client';

export async function createElasticAgentPolicy(
  { agentPolicyName }: CliOptions,
  logger: ToolingLog,
  kibanaApiClient: KibanaAPIClient
) {
  try {
    const response = await kibanaApiClient.sendRequest({
      method: 'post',
      url: 'api/fleet/agent_policies',
      data: {
        name: agentPolicyName,
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        inactivity_timeout: 1209600,
        is_protected: false,
      },
    });

    logger.info(`Generated elastic agent policy`);
    return response.data;
  } catch (error) {
    if (isError(error)) {
      logger.error(`Error generating elastic agent policy: ${error.message} ${error.stack}`);
    }
    throw error;
  }
}
