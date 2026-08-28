/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AiIndexProperties } from '../../common/http_api/ai_indices';
import type { AiIndexService } from './service';
import { AiIndexConflictError, AiIndexIdConflictError, InvalidAiIndexDestError } from './errors';

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
    isEnabled,
    logger,
  }: {
    aiIndexService: AiIndexService;
    isEnabled: boolean;
    logger: Logger;
  }): Promise<void> {
    this.started = true;

    if (!isEnabled) {
      logger.debug('contextEngine:enabled is false — skipping AI index auto-registration');
      return;
    }

    for (const [id, properties] of this.entries) {
      await this.registerOne({ id, properties, aiIndexService, logger });
    }
  }

  private async registerOne({
    id,
    properties,
    aiIndexService,
    logger,
  }: {
    id: string;
    properties: AiIndexProperties;
    aiIndexService: AiIndexService;
    logger: Logger;
  }): Promise<void> {
    // Idempotent upsert on every startup: `putManaged` is the source of truth,
    // so it creates the entry on first boot and refreshes it on later boots
    // (picking up any registration changes without a manual recovery step).
    try {
      const result = await aiIndexService.putManaged(id, properties);
      if (result === 'created') {
        logger.info(`AI index '${id}' registered successfully`);
      } else {
        logger.debug(`AI index '${id}' registration refreshed`);
      }
    } catch (err) {
      if (err instanceof InvalidAiIndexDestError) {
        logger.warn(`AI index '${id}' dest is not valid: '${err.message}'. Skipped.`);
      } else if (err instanceof AiIndexIdConflictError) {
        logger.warn(
          `AI index '${id}' is already registered as a user-owned index; skipping managed registration.`
        );
      } else if (err instanceof AiIndexConflictError) {
        // Another Kibana instance registered this entry concurrently; benign.
        logger.debug(`AI index '${id}' was registered concurrently — skipping.`);
      } else {
        logger.warn(
          `Failed to register AI index '${id}': ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
}
