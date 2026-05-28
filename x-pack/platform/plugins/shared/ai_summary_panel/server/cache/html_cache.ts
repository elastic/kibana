/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ISavedObjectsRepository } from '@kbn/core/server';

export const CACHE_SO_TYPE = 'ai_panel_html_cache';
export const CACHE_INDEX = '.kibana_ai_panel_html_cache';

export const L3_TTL_SECONDS = 7 * 24 * 60 * 60;
export const TEMPLATE_TTL_SECONDS = 30 * 24 * 60 * 60;

interface CacheAttributes {
  html: string;
  expiresAt: string;
}

export interface CacheResult {
  html: string;
  stale: boolean;
}

export function hashKey(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export async function getCached(
  repo: ISavedObjectsRepository,
  key: string
): Promise<CacheResult | null> {
  try {
    const so = await repo.get<CacheAttributes>(CACHE_SO_TYPE, key);
    return {
      html: so.attributes.html,
      stale: new Date(so.attributes.expiresAt) <= new Date(),
    };
  } catch {
    return null;
  }
}

export async function setCached(
  repo: ISavedObjectsRepository,
  key: string,
  html: string,
  ttlSeconds: number
): Promise<void> {
  try {
    await repo.create<CacheAttributes>(
      CACHE_SO_TYPE,
      { html, expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString() },
      { id: key, overwrite: true }
    );
  } catch {
    // Non-fatal — cache write failure just means next request regenerates
  }
}

export async function cleanupExpired(repo: ISavedObjectsRepository): Promise<void> {
  const expired = await repo.find<CacheAttributes>({
    type: CACHE_SO_TYPE,
    filter: `${CACHE_SO_TYPE}.attributes.expiresAt < "${new Date().toISOString()}"`,
    perPage: 1000,
  });
  await Promise.all(
    expired.saved_objects.map((so) => repo.delete(CACHE_SO_TYPE, so.id).catch(() => {}))
  );
}
