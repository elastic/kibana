/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosResponse } from 'axios';
import axios from 'axios';

import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { Logger } from '@kbn/core/server';
import type {
  ExternalService,
  ExternalServiceCredentials,
  ExternalServiceIncidentResponse,
  RunWorkflowParams,
} from './types';
import { createServiceError } from './utils';

export const createExternalService = (
  actionId: string,
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  connectorUsageCollector: ConnectorUsageCollector
): ExternalService => {
  // For internal Kibana API calls, we need to construct the proper URL
  // Default to localhost:5601 but this should be configurable in production
  const kibanaBaseUrl = process.env.KIBANA_URL || 'http://localhost:5601';

  const axiosInstance = axios.create({
    baseURL: kibanaBaseUrl,
  });

  const runWorkflow = async ({
    workflowId,
    inputs = {},
  }: RunWorkflowParams): Promise<ExternalServiceIncidentResponse> => {
    try {
      logger.info(`Attempting to run workflow ${workflowId} via internal API`);

      // Use internal Kibana API to run workflow
      const runRes: AxiosResponse = await request({
        axios: axiosInstance,
        url: `/api/workflows/${workflowId}/run`,
        method: 'post',
        logger,
        data: { inputs },
        headers: {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'true', // Required for Kibana API calls
        },
        configurationUtilities,
        validateStatus: () => true,
      });

      logger.info(`Workflow API response: status=${runRes.status}`);

      if (runRes.status >= 400) {
        throw new Error(
          `Failed to run workflow. Status: ${runRes.status}, Response: ${JSON.stringify(
            runRes.data
          )}`
        );
      }

      const workflowRunId = runRes.data;

      if (!workflowRunId) {
        throw new Error('Invalid response: missing workflowRunId');
      }

      logger.info(`Successfully started workflow ${workflowId}, run ID: ${workflowRunId}`);

      return {
        workflowRunId,
        status: 'executed',
      };
    } catch (error) {
      logger.error(`Error running workflow ${workflowId}: ${error.message}`);
      throw createServiceError(error, `Unable to run workflow ${workflowId}`);
    }
  };

  return {
    runWorkflow,
  };
};
