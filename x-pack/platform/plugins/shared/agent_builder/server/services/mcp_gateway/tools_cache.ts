/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tool } from '@kbn/mcp-client';

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  tools: Tool[];
  expiresAt: number;
}

/**
 * In-memory TTL cache for listTools results from external MCP connectors.
 * Keyed by `{spaceId}:{connectorId}` to isolate results across spaces.
 */
export class McpGatewayToolsCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor({ ttlMs = DEFAULT_TTL_MS }: { ttlMs?: number } = {}) {
    this.ttlMs = ttlMs;
  }

  private key(spaceId: string, connectorId: string): string {
    return `${spaceId}:${connectorId}`;
  }

  get(spaceId: string, connectorId: string): Tool[] | undefined {
    const entry = this.cache.get(this.key(spaceId, connectorId));
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(this.key(spaceId, connectorId));
      return undefined;
    }
    return entry.tools;
  }

  set(spaceId: string, connectorId: string, tools: Tool[]): void {
    this.cache.set(this.key(spaceId, connectorId), {
      tools,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(spaceId: string, connectorId: string): void {
    this.cache.delete(this.key(spaceId, connectorId));
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}
