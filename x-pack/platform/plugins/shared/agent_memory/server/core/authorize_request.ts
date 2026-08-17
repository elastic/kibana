/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { resolveIdentity, type ResolvedIdentity } from './resolve_identity';

export type MemoryRequestAuthorization =
  | { status: 'forbidden' }
  | { status: 'missing_identity' }
  | { status: 'authorized'; identity: ResolvedIdentity };

/** Checks a memory API privilege and resolves the request-scoped identity. */
export const authorizeMemoryRequest = async ({
  request,
  spaceId,
  privilege,
  security,
  coreSecurity,
}: {
  request: KibanaRequest;
  spaceId: string;
  privilege: string;
  security: SecurityPluginStart;
  coreSecurity: SecurityServiceStart;
}): Promise<MemoryRequestAuthorization> => {
  const { hasAllRequested } = await security.authz
    .checkPrivilegesWithRequest(request)
    .atSpace(spaceId, {
      kibana: [security.authz.actions.api.get(privilege)],
    });

  if (!hasAllRequested) {
    return { status: 'forbidden' };
  }

  const identity = resolveIdentity({ request, security: coreSecurity });
  if (!identity) {
    return { status: 'missing_identity' };
  }

  return { status: 'authorized', identity };
};
