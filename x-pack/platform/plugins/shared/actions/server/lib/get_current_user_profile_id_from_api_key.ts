/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, IClusterClient } from '@kbn/core/server';
import { extractApiKeyIdFromAuthzHeader } from '@kbn/core-security-server';

export async function getCurrentUserProfileIdFromAPIKey(
  request: KibanaRequest,
  esClient: IClusterClient,
  logger: Logger
): Promise<string | undefined> {
  try {
    const id = extractApiKeyIdFromAuthzHeader(request.headers.authorization);
    if (!id) {
      logger.debug(`Failed to decode API key ID from Authorization header.`);
      return undefined;
    }

    const response = await esClient.asScoped(request).asCurrentUser.security.getApiKey({
      with_profile_uid: true,
      id,
    });

    if (response.api_keys && response.api_keys.length > 0) {
      return response.api_keys[0].profile_uid;
    }

    logger.debug(`No API keys were returned from query, cannot retrieve associated profile id.`);
  } catch (error) {
    logger.debug(
      `Failed to retrieve API key for user profile retrieval: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return undefined;
}
