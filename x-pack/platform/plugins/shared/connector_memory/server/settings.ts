/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import type { LearnSettings } from '../common/types';
import type { ConnectorMemoryConfig } from './config';
import type { MemoryStore } from './memory';

const reach = schema.oneOf([
  schema.literal('direct'),
  schema.literal('siblings'),
  schema.literal('area'),
]);

/** What an admin may change for a connector; anything left out follows the server's defaults. */
export const overridesSchema = schema.object({
  learn: schema.maybe(schema.oneOf([schema.literal('off'), schema.literal('reads')])),
  reach: schema.maybe(reach),
  area: schema.maybe(
    schema.object({
      maxFiles: schema.maybe(schema.number({ min: 1, max: 500 })),
      maxDepth: schema.maybe(schema.number({ min: 0, max: 6 })),
    })
  ),
  summarizeReads: schema.maybe(schema.boolean()),
});

export type Overrides = TypeOf<typeof overridesSchema>;

export const defaultsOf = ({ learn }: Pick<ConnectorMemoryConfig, 'learn'>): LearnSettings => ({
  learn: 'reads',
  reach: learn.reach,
  area: { maxFiles: learn.maxFiles, maxDepth: learn.maxDepth },
  summarizeReads: learn.summarize,
});

const merge = (defaults: LearnSettings, overrides?: Overrides): LearnSettings => ({
  learn: overrides?.learn ?? defaults.learn,
  reach: overrides?.reach ?? defaults.reach,
  area: {
    maxFiles: overrides?.area?.maxFiles ?? defaults.area.maxFiles,
    maxDepth: overrides?.area?.maxDepth ?? defaults.area.maxDepth,
  },
  summarizeReads: overrides?.summarizeReads ?? defaults.summarizeReads,
});

interface Target {
  esClient: ElasticsearchClient;
  spaceId: string;
  connectorId: string;
}

/** What each connector is set to learn: the server's defaults with an admin's choices over them, read from the index. */
export class ConnectorSettings {
  private readonly cache = new Map<string, { overrides?: Overrides; at: number }>();

  constructor(
    private readonly deps: { store: MemoryStore; defaults: LearnSettings; ttlMs?: number }
  ) {}

  private async overrides(target: Target, fresh = false): Promise<Overrides | undefined> {
    const key = `${target.spaceId}|${target.connectorId}`;
    const cached = this.cache.get(key);
    if (!fresh && cached && Date.now() - cached.at < (this.deps.ttlMs ?? 30_000)) {
      return cached.overrides;
    }
    try {
      const raw = await this.deps.store.getSettings(
        target.esClient,
        target.spaceId,
        target.connectorId
      );
      const overrides = raw === undefined ? undefined : overridesSchema.validate(raw);
      this.cache.set(key, { overrides, at: Date.now() });
      return overrides;
    } catch {
      // Unreadable (or no index yet): behave as the defaults say.
      return cached?.overrides;
    }
  }

  async effective(target: Target): Promise<LearnSettings> {
    return merge(this.deps.defaults, await this.overrides(target));
  }

  async describe(target: Target): Promise<{ effective: LearnSettings; customized: boolean }> {
    const overrides = await this.overrides(target, true);
    return {
      effective: merge(this.deps.defaults, overrides),
      customized: overrides !== undefined && Object.keys(overrides).length > 0,
    };
  }

  async save(target: Target, overrides: Overrides): Promise<void> {
    await this.deps.store.putSettings(
      target.esClient,
      target.spaceId,
      target.connectorId,
      overrides
    );
    this.cache.delete(`${target.spaceId}|${target.connectorId}`);
  }

  async reset(target: Target): Promise<void> {
    await this.deps.store.removeSettings(target.esClient, target.spaceId, target.connectorId);
    this.cache.delete(`${target.spaceId}|${target.connectorId}`);
  }
}
