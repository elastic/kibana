/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

/**
 * Resolves the current user profile UID from the interactive auth context on a real
 * `KibanaRequest` (HTTP routes, route-handler `ActionsClient`, event log providers).
 * `security.userProfiles.getCurrent` requires a session-capable request.
 *
 * Do not use this for the action executor: execution uses a `FakeRequest` without a session,
 * so profile lookup must go through the API-key path (`getCurrentUserProfileIdFromAPIKey` in
 * `plugin.ts`) instead.
 */
export async function getCurrentUserProfileIdFromRequest(
  requestWithAuth: KibanaRequest,
  security: SecurityPluginStart | undefined,
  logger: Logger
): Promise<string | undefined> {
  try {
    const profile = await security?.userProfiles.getCurrent({
      request: requestWithAuth,
    });
    if (profile?.uid) {
      return profile.uid;
    }
  } catch (error) {
    logger.debug(
      `Failed to retrieve user profile from current auth context: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return undefined;
}
