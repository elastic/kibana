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
  // Use internal Kibana API - no external URL needed
  const axiosInstance = axios.create();

  const runWorkflow = async ({
    workflowId,
    inputs = {},
  }: RunWorkflowParams): Promise<ExternalServiceIncidentResponse> => {
    try {
      // Use internal Kibana API to run workflow
      const runRes: AxiosResponse = await request({
        axios: axiosInstance,
        url: `/api/workflows/${workflowId}/run`,
        method: 'post',
        logger,
        data: { inputs },
        headers: {
          'Content-Type': 'application/json',
        },
        configurationUtilities,
        validateStatus: () => true,
      });

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

      return {
        workflowRunId,
        status: 'executed',
      };
    } catch (error) {
      throw createServiceError(error, `Unable to run workflow ${workflowId}`);
    }
  };

  return {
    runWorkflow,
  };
};
