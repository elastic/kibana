/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isError } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { CliOptions } from '../types';
import { KibanaAPIClient } from './kibana_api_client';

export async function generateFleetServiceToken(
  { kibanaUrl, kibanaPassword, kibanaUsername }: CliOptions,
  logger: ToolingLog,
  kibanaApiClient: KibanaAPIClient
) {
  try {
    const response = await kibanaApiClient.sendRequest({
      method: 'post',
      url: 'api/fleet/service_tokens',
    });

    logger.info(`Generated fleet server service token saved`);
    return response.data;
  } catch (error) {
    if (isError(error)) {
      logger.error(`Error generating fleet server service token: ${error.message} ${error.stack}`);
    }
    throw error;
  }
}
