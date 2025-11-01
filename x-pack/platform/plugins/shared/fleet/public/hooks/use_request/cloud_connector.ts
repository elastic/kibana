/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateAgentPolicyWithCloudConnectorRequest,
  CreateAgentPolicyWithCloudConnectorResponse,
} from '../../../common/types/rest_spec/cloud_connector';
import { CLOUD_CONNECTOR_API_ROUTES, API_VERSIONS } from '../../../common/constants';

import { sendRequest } from './use_request';

/**
 * Send a request to create an agent policy with cloud connector and package policy atomically.
 * This is an internal API that ensures all resources are created together or rolled back on failure.
 *
 * @param body - The request body containing agent policy, cloud connector, and package policy data
 * @returns Promise with the created resource IDs
 */
export const sendCreateAgentPolicyWithCloudConnector = (
  body: CreateAgentPolicyWithCloudConnectorRequest
) => {
  return sendRequest<CreateAgentPolicyWithCloudConnectorResponse>({
    path: CLOUD_CONNECTOR_API_ROUTES.CREATE_WITH_PACKAGE_POLICY,
    method: 'post',
    version: API_VERSIONS.internal.v1,
    body: JSON.stringify(body),
  });
};
