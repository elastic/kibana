/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AiIndexProperties } from '../../common/http_api/ai_indices';
import type { AiIndexService } from './service';
import { InvalidAiIndexDestError } from './errors';
import { applyDls, applyIndexConfig } from './index_config';

export class AiIndexRegistry {
  private readonly entries = new Map<string, AiIndexProperties>();
  private started = false;

  register(id: string, properties: AiIndexProperties): void {
    if (this.started) {
      throw new Error('registerAiIndex called after plugin start');
    }
    if (this.entries.has(id)) {
      throw new Error(`AI index '${id}' is already registered`);
    }
    this.entries.set(id, properties);
  }

  async startupRegister({
    aiIndexService,
    esClient,
    isEnabled,
    logger,
  }: {
    aiIndexService: AiIndexService;
    esClient: ElasticsearchClient;
    isEnabled: boolean;
    logger: Logger;
  }): Promise<void> {
    this.started = true;

    if (!isEnabled) {
      logger.debug('contextEngine:enabled is false — skipping AI index auto-registration');
      return;
    }

    for (const [id, properties] of this.entries) {
      await this.registerOne({ id, properties, aiIndexService, esClient, logger });
    }
  }

  private async registerOne({
    id,
    properties,
    aiIndexService,
    esClient,
    logger,
  }: {
    id: string;
    properties: AiIndexProperties;
    aiIndexService: AiIndexService;
    esClient: ElasticsearchClient;
    logger: Logger;
  }): Promise<void> {
    // index_config and dls are applied to the dest, not stored on the ai-index doc.
    const { index_config: indexConfig, dls, ...storedProperties } = properties;

    // Apply the index template/mappings and DLS role on every startup — both are
    // idempotent upserts, so they stay current even when the ai-index doc already exists.
    await applyIndexConfig({ esClient, id, dest: properties.dest, indexConfig, logger });
    if (dls) {
      await applyDls({ esClient, id, dest: properties.dest, dls, logger });
    }

    // Reconcile the managed doc on every startup (putManaged is an idempotent upsert), so
    // changes to the declared metadata — notably `automations` (the ids of the workflows that
    // populate this ai-index) — persist across restarts rather than being frozen at first
    // registration.
    try {
      const outcome = await aiIndexService.putManaged(id, storedProperties);
      logger.info(`AI index '${id}' ${outcome === 'created' ? 'registered' : 'reconciled'}`);
    } catch (err) {
      if (err instanceof InvalidAiIndexDestError) {
        logger.warn(`AI index '${id}' dest is not valid: '${err.message}'. Skipped.`);
      } else {
        logger.warn(
          `Failed to register AI index '${id}': ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
}
