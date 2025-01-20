/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PostStandaloneAgentAPIKeyRequest,
  PostStandaloneAgentAPIKeyResponse,
} from '../../types';

import { API_VERSIONS, CREATE_STANDALONE_AGENT_API_KEY_ROUTE } from '../../../common/constants';

import { sendRequestForRq } from './use_request';

export function sendCreateStandaloneAgentAPIKey(body: PostStandaloneAgentAPIKeyRequest['body']) {
  return sendRequestForRq<PostStandaloneAgentAPIKeyResponse>({
    method: 'post',
    path: CREATE_STANDALONE_AGENT_API_KEY_ROUTE,
    version: API_VERSIONS.internal.v1,
    body,
  });
}
