/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { API_VERSIONS } from '@kbn/evals-common';
import type { KibanaRequest } from '@kbn/core/server';
import {
  EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
  type EvalsRemoteKibanaConfigAttributes,
} from '../saved_objects/remote_kibana_config';

export const DESTINATION_QUERY_PARAM = 'destination' as const;

export const ENCRYPTION_NOT_CONFIGURED_MESSAGE =
  'Encrypted Saved Objects is not configured. Remote forwarding is unavailable.';

const FORWARD_TIMEOUT_MS = 30_000;

const ALLOWED_CLOUD_SUFFIXES = ['.cloud.es.io', '.elastic.cloud'] as const;

/**
 * Validates that a URL points to an Elastic Cloud Kibana deployment.
 * Accepts hosted (`*.cloud.es.io`) and serverless (`*.elastic.cloud`) URLs over HTTPS.
 *
 * @returns An error message string if invalid, or `undefined` if valid.
 */
export const validateElasticCloudUrl = (urlString: string): string | undefined => {
  let url: URL;
  try {
    url = new URL(urlString.trim());
  } catch {
    return 'Invalid URL format.';
  }

  if (url.protocol !== 'https:') {
    return 'URL must use HTTPS.';
  }

  const hostname = url.hostname.toLowerCase();
  const isAllowedHost = ALLOWED_CLOUD_SUFFIXES.some((suffix) => {
    const idx = hostname.lastIndexOf(suffix);
    return idx > 0 && idx + suffix.length === hostname.length;
  });
  if (!isAllowedHost) {
    return `URL must be an Elastic Cloud deployment (${ALLOWED_CLOUD_SUFFIXES.join(' or ')}).`;
  }
};

export const getDestinationFromRequest = (request: KibanaRequest): string | null => {
  return request.url.searchParams.get(DESTINATION_QUERY_PARAM);
};

export const stripDestinationFromSearchParams = (
  searchParams: URLSearchParams
): URLSearchParams => {
  const next = new URLSearchParams(searchParams);
  next.delete(DESTINATION_QUERY_PARAM);
  return next;
};

export interface RemoteForwardResult {
  statusCode: number;
  body: Record<string, any> | string;
}

const toRemoteUrl = ({
  remoteBaseUrl,
  requestPathname,
  searchParams,
}: {
  remoteBaseUrl: string;
  requestPathname: string;
  searchParams: URLSearchParams;
}): string => {
  const remote = new URL(remoteBaseUrl);
  const basePath = remote.pathname === '/' ? '' : remote.pathname.replace(/\/$/, '');
  remote.pathname = `${basePath}${requestPathname}`;
  remote.search = searchParams.toString();
  return remote.toString();
};

export class RemoteDecryptionError extends Error {
  constructor(remoteId: string, cause?: Error) {
    super(
      `Unable to decrypt credentials for remote "${remoteId}". ` +
        'The encryption key may have changed since this remote was saved. ' +
        'Delete the remote and recreate it with a fresh API key.'
    );
    this.name = 'RemoteDecryptionError';
    if (cause) {
      this.cause = cause;
    }
  }
}

export const getDecryptedRemoteKibanaConfig = async ({
  encryptedSavedObjects,
  remoteId,
}: {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  remoteId: string;
}): Promise<EvalsRemoteKibanaConfigAttributes> => {
  const encryptedClient = encryptedSavedObjects.getClient({
    includedHiddenTypes: [EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE],
  });

  try {
    const decrypted =
      await encryptedClient.getDecryptedAsInternalUser<EvalsRemoteKibanaConfigAttributes>(
        EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
        remoteId
      );
    return decrypted.attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw new Error(`Remote config not found: ${remoteId}`);
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Unable to decrypt') || msg.includes('Invalid initialization vector')) {
      throw new RemoteDecryptionError(remoteId, error instanceof Error ? error : undefined);
    }
    throw error;
  }
};

export const forwardToRemoteKibana = async ({
  encryptedSavedObjects,
  remoteId,
  request,
  method,
  body,
}: {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  remoteId: string;
  request: KibanaRequest;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}): Promise<RemoteForwardResult> => {
  const remoteConfig = await getDecryptedRemoteKibanaConfig({ encryptedSavedObjects, remoteId });

  const urlError = validateElasticCloudUrl(remoteConfig.url);
  if (urlError) {
    throw new Error(`Remote "${remoteId}" has an invalid URL: ${urlError}`);
  }

  const url = toRemoteUrl({
    remoteBaseUrl: remoteConfig.url,
    requestPathname: request.url.pathname,
    searchParams: stripDestinationFromSearchParams(request.url.searchParams),
  });

  const res = await fetch(url, {
    method,
    headers: {
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
      'content-type': 'application/json',
      'elastic-api-version': API_VERSIONS.internal.v1,
      Authorization: `ApiKey ${remoteConfig.apiKey}`,
    },
    body: body == null || method === 'GET' ? undefined : JSON.stringify(body),
    timeout: FORWARD_TIMEOUT_MS,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const parsedBody: RemoteForwardResult['body'] = contentType.includes('application/json')
    ? ((await res.json()) as Record<string, any>)
    : await res.text();

  return { statusCode: res.status, body: parsedBody };
};
