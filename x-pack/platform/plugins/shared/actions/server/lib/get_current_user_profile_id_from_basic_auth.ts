/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, IClusterClient } from '@kbn/core/server';

export async function getCurrentUserProfileIdFromBasicAuth(
  request: KibanaRequest,
  esClient: IClusterClient,
  logger: Logger
): Promise<string | undefined> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return undefined;
    }

    const trimmed = authHeader.trim();
    const normalized = trimmed.toLowerCase();
    if (!normalized.startsWith('basic ')) {
      return undefined;
    }

    const base64Credentials = trimmed.substring('basic '.length);
    const decoded = Buffer.from(base64Credentials, 'base64').toString();
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex === -1) {
      logger.debug(`Malformed basic credentials in Authorization header.`);
      return undefined;
    }

    const username = decoded.substring(0, separatorIndex);
    const password = decoded.substring(separatorIndex + 1);

    if (!username || !password) {
      logger.debug(`Malformed basic credentials in Authorization header.`);
      return undefined;
    }

    const response = await esClient.asInternalUser.security.activateUserProfile({
      grant_type: 'password',
      username,
      password,
    });

    return response.uid;
  } catch (error) {
    logger.debug(
      `Failed to activate user profile from Basic auth credentials: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return undefined;
}
