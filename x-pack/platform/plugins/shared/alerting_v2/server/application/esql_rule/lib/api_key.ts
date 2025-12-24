/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate, trim } from 'lodash';
import { HTTPAuthorizationHeader } from '@kbn/core-http-server';
import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

export type CreateAPIKeyResult =
  | { apiKeysEnabled: false }
  | {
      apiKeysEnabled: true;
      result: {
        name: string;
        id: string;
        api_key: string;
      };
    };

export function generateAPIKeyName(ruleTypeId: string, ruleName: string) {
  return truncate(`AlertingV2: ${ruleTypeId}/${trim(ruleName)}`, { length: 256 });
}

export function apiKeyAsEsqlRuleDomainProperties(
  apiKey: CreateAPIKeyResult | null,
  username: string | null,
  createdByUser: boolean
): { apiKey: string | null; apiKeyOwner: string | null; apiKeyCreatedByUser: boolean | null } {
  return apiKey && apiKey.apiKeysEnabled
    ? {
        apiKeyOwner: username,
        apiKey: Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64'),
        apiKeyCreatedByUser: createdByUser,
      }
    : {
        apiKeyOwner: null,
        apiKey: null,
        apiKeyCreatedByUser: null,
      };
}

export async function createAPIKey({
  security,
  request,
  name,
}: {
  security?: SecurityPluginStart;
  request: KibanaRequest;
  name: string;
}): Promise<CreateAPIKeyResult> {
  if (!security) {
    return { apiKeysEnabled: false };
  }
  const createAPIKeyResult = await security.authc.apiKeys.grantAsInternalUser(request, {
    name,
    role_descriptors: {},
    metadata: { managed: true, kibana: { type: 'alerting_v2_esql_rule' } },
  });
  if (!createAPIKeyResult) {
    return { apiKeysEnabled: false };
  }
  return { apiKeysEnabled: true, result: createAPIKeyResult };
}

export function isAuthenticationTypeAPIKey(
  security: SecurityPluginStart | undefined,
  request: KibanaRequest
) {
  if (!security) return false;
  const user = security.authc.getCurrentUser(request);
  return user && user.authentication_type ? user.authentication_type === 'api_key' : false;
}

export function getAuthenticationAPIKey(request: KibanaRequest, name: string): CreateAPIKeyResult {
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  if (authorizationHeader && authorizationHeader.credentials) {
    const apiKey = Buffer.from(authorizationHeader.credentials, 'base64').toString().split(':');
    return {
      apiKeysEnabled: true,
      result: {
        name,
        id: apiKey[0],
        api_key: apiKey[1],
      },
    };
  }
  return { apiKeysEnabled: false };
}
