/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import type { CatalogSource } from './types';

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

const isFetchError = (error: unknown): error is Error & { name: string; type?: string } =>
  error instanceof Error && error.name === 'FetchError';

export interface RemoteCatalogSourceOptions {
  registryUrl: string;
  kibanaVersion: string;
  requestTimeoutMs?: number;
}

/** Fetches catalog.json, catalog.json.sig, and row/icon files from a remote origin. */
export class RemoteCatalogSource implements CatalogSource {
  public readonly origin: string;

  constructor(private readonly options: RemoteCatalogSourceOptions) {
    this.origin = normalizeRegistryUrl(options.registryUrl).origin;
  }

  public async readManifest(): Promise<{ bytes: string; signature: string }> {
    const [bytes, signature] = await Promise.all([
      this.readText('catalog.json', MAX_CATALOG_BYTES),
      this.readText('catalog.json.sig', 4096),
    ]);
    return { bytes, signature: signature.trim() };
  }

  public async readText(path: string, maxBytes: number): Promise<string> {
    const url = resolveRegistryUrl(this.options.registryUrl, path);
    const timeoutMs = this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    let response;
    try {
      response = await fetch(url, {
        timeout: timeoutMs,
        size: maxBytes,
        headers: {
          'User-Agent': `Kibana/${this.options.kibanaVersion}`,
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
    if (new URL(response.url).origin !== this.origin) {
      throw new Error(REDIRECT_ERROR);
    }
    return response.text();
  }
}

/** Runs `task` over `items` with at most `limit` promises in flight; preserves input order. */
export const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
};
