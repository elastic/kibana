/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '../../../common';

import { agentlessPolicyRouteService } from '../../../common/services';
import type {
  CreateAgentlessPolicyRequest,
  CreateAgentlessPolicyResponse,
  DeleteAgentlessPolicyRequest,
  DeleteAgentlessPolicyResponse,
} from '../../../common/types/rest_spec/agentless_policy';

import { sendRequestForRq } from './use_request';

export const sendCreateAgentlessPolicy = (
  body: CreateAgentlessPolicyRequest['body'],
  query?: CreateAgentlessPolicyRequest['query']
) => {
  return sendRequestForRq<CreateAgentlessPolicyResponse>({
    path: agentlessPolicyRouteService.getCreatePath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(body),
    query,
  });
};

export const sendDeleteAgentlessPolicy = (
  policyId: string,
  query?: DeleteAgentlessPolicyRequest['query']
) => {
  return sendRequestForRq<DeleteAgentlessPolicyResponse>({
    path: agentlessPolicyRouteService.getDeletePath(policyId),
    method: 'delete',
    version: API_VERSIONS.public.v1,
    query,
  });
};
