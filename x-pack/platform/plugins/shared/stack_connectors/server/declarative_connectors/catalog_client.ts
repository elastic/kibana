/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';

export const MAX_CATALOG_BYTES = 1024 * 1024;
export const MAX_SPEC_BYTES = 256 * 1024;
export const MAX_ICON_BYTES = 64 * 1024;
export const DEFAULT_REQUEST_TIMEOUT_MS = 3_000;

const ORIGIN_ERROR = 'Declarative connector catalog URLs must remain on the registry origin.';
const REDIRECT_ERROR =
  'Declarative connector catalog redirects must remain on the registry origin.';

const normalizeRegistryUrl = (registryUrl: string): URL =>
  new URL(registryUrl.endsWith('/') ? registryUrl : `${registryUrl}/`);

const isSchemeBearing = (path: string): boolean =>
  path.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(path);

/** Resolves a catalog path against the registry origin and rejects a different origin. */
export const resolveRegistryUrl = (registryUrl: string, path: string): string => {
  const registry = normalizeRegistryUrl(registryUrl);
  const resolved = isSchemeBearing(path)
    ? new URL(path)
    : new URL(path.replace(/^\/+/, ''), registry);
  if (resolved.origin !== registry.origin) {
    throw new Error(ORIGIN_ERROR);
  }
  return resolved.toString();
};

/** Resolves an icon or sibling asset against its definition URL, pinned to the registry origin. */
export const resolveAssetUrl = (
  registryUrl: string,
  definitionPath: string,
  assetPath: string
): string => {
  const definitionUrl = resolveRegistryUrl(registryUrl, definitionPath);
  if (isSchemeBearing(assetPath)) {
    const absolute = new URL(assetPath);
    if (absolute.origin !== new URL(registryUrl).origin) {
      throw new Error(ORIGIN_ERROR);
    }
    return absolute.toString();
  }
  const iconUrl = new URL(assetPath, definitionUrl);
  if (iconUrl.origin !== new URL(registryUrl).origin) {
    throw new Error(ORIGIN_ERROR);
  }
  return iconUrl.toString();
};

const isFetchError = (error: unknown): error is Error & { name: string; type?: string } =>
  error instanceof Error && error.name === 'FetchError';

/** Fetches a catalog document with origin pinning, a timeout, and a response-size cap. */
export const fetchCatalogText = async ({
  registryUrl,
  path,
  maxBytes,
  timeoutMs,
}: {
  registryUrl: string;
  path: string;
  maxBytes: number;
  timeoutMs: number;
}): Promise<string> => {
  const url = resolveRegistryUrl(registryUrl, path);
  let response;
  try {
    response = await fetch(url, {
      timeout: timeoutMs,
      size: maxBytes,
      headers: {
        'User-Agent': 'Kibana declarative-connectors-poc',
      },
    });
  } catch (error) {
    if (isFetchError(error) && error.type === 'max-size') {
      throw new Error(`Catalog response exceeded the ${maxBytes} byte limit at ${url}.`, {
        cause: error,
      });
    }
    if (isFetchError(error) && error.type === 'request-timeout') {
      throw new Error(`Catalog request timed out at ${url}.`, { cause: error });
    }
    throw error;
  }
  if (!response.ok) {
    throw new Error(`Catalog request failed with HTTP ${response.status} at ${url}.`);
  }
  if (new URL(response.url).origin !== new URL(registryUrl).origin) {
    throw new Error(REDIRECT_ERROR);
  }
  return response.text();
};
