/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  MCPConnectorAuthType,
  MCPConnectorAuthNone,
  MCPConnectorAuthHeader,
  MCPConnectorAuthOAuth,
  MCPConnectorAuth,
} from './types';

export type { Header } from './header_auth';

export {
  createBasicAuthHeader,
  createBearerTokenHeader,
  createApiKeyHeader,
  buildAuthHeaders,
} from './header_auth';
