/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TTL-based file cache for EIS (Elastic Inference Service) connector definitions.
 *
 * Stores the connector map at ~/.elastic/eis-connectors-cache.json as plain JSON
 * so that `evals start` can restore KIBANA_TESTING_INFERENCE_ENDPOINTS without
 * requiring a fresh `evals init` every shell session.
 *
 * The payload is deterministic and contains no secrets (secrets: {} is always
 * empty in EIS connector objects).
 *
 * TTL is 7 days - matching the CCM key cache. No stale-read variant: a stale
 * model list can cause 404s at inference time, so a miss is safer than serving
 * outdated connectors.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { validateInferenceEndpointEntry } from '../utils/inference_endpoint_definition';

interface CachedEisConnectors {
  connectors: Record<string, object>;
  fetched_at_ms: number;
}

const CACHE_DIR = path.join(os.homedir(), '.elastic');
const CACHE_PATH = path.join(CACHE_DIR, 'eis-connectors-cache.json');
const TTL_MS = 168 * 60 * 60 * 1000; // 7 days

export type EisCacheStatus = 'fresh' | 'expired' | 'missing' | 'malformed';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Every cached entry is exported as an inference endpoint definition, so an entry
 * that `loadInferenceEndpoints()` would reject (null, scalar, or missing
 * `inferenceId`/`provider`/`taskType`/`name`) has to fail here as `malformed`
 * rather than surfacing as a Playwright startup crash.
 */
const connectorsAreUsable = (connectors: Record<string, unknown>): boolean =>
  Object.entries(connectors).every(
    ([id, definition]) => validateInferenceEndpointEntry(id, definition) === undefined
  );

const parseCachedEntry = (cachePath: string): CachedEisConnectors | undefined => {
  try {
    const raw = fs.readFileSync(cachePath, 'utf-8');
    const cached: unknown = JSON.parse(raw);
    if (!isPlainObject(cached)) {
      return undefined;
    }
    const { connectors, fetched_at_ms: fetchedAtMs } = cached;
    if (
      !isPlainObject(connectors) ||
      Object.keys(connectors).length === 0 ||
      !connectorsAreUsable(connectors) ||
      typeof fetchedAtMs !== 'number' ||
      !Number.isFinite(fetchedAtMs)
    ) {
      return undefined;
    }
    return { connectors: connectors as Record<string, object>, fetched_at_ms: fetchedAtMs };
  } catch {
    return undefined;
  }
};

export const getEisCacheStatus = (cachePath: string = CACHE_PATH): EisCacheStatus => {
  if (!fs.existsSync(cachePath)) {
    return 'missing';
  }

  const cached = parseCachedEntry(cachePath);
  if (!cached) {
    return 'malformed';
  }

  if (Date.now() - cached.fetched_at_ms > TTL_MS) {
    return 'expired';
  }

  return 'fresh';
};

export const readCachedEisConnectors = (
  cachePath: string = CACHE_PATH
): Record<string, object> | undefined => {
  const cached = parseCachedEntry(cachePath);
  if (!cached || Date.now() - cached.fetched_at_ms > TTL_MS) {
    return undefined;
  }
  return cached.connectors;
};

export const writeCachedEisConnectors = (connectors: Record<string, object>): void => {
  const entry: CachedEisConnectors = {
    connectors,
    fetched_at_ms: Date.now(),
  };

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(entry, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
};
