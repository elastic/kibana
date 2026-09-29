/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_OAUTH_BASE_URL } from '@kbn/mock-idp-utils';

export const SAML_USERNAME = '1234567890';
export const UIAM_SAML_ACS_URL = MOCK_IDP_UIAM_OAUTH_BASE_URL.replace('/oauth2', '/saml/consume');
export const MCP_ENDPOINT = 'api/agent_builder/mcp';
export const CLIENTS_BASE = 'internal/security/oauth/clients';
export const REDIRECT_URI = 'https://example.com/callback';
