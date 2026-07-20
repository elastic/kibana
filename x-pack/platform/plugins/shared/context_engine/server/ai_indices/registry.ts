/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AiIndexProperties } from '../../common/http_api/ai_indices';
import type { AiIndexService } from './service';
import { AiIndexNotFoundError, InvalidAiIndexDestError } from './errors';

interface RegistrationEntry {
  id: string;
  properties: AiIndexProperties;
}

export class AiIndexRegistry {
  private readonly entries: RegistrationEntry[] = [];
  private started = false;

  register(id: string, properties: AiIndexProperties): void {
    if (this.started) {
      throw new Error('registerAiIndex called after plugin start');
    }
    if (this.entries.some((e) => e.id === id)) {
      throw new Error(`AI index '${id}' is already registered`);
    }
    this.entries.push({ id, properties });
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

    for (const { id, properties } of this.entries) {
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
    try {
      await aiIndexService.get(id);
      logger.debug(`AI index '${id}' already registered — skipping`);
      return;
    } catch (err) {
      if (!(err instanceof AiIndexNotFoundError)) {
        logger.warn(
          `Failed to check AI index '${id}' registration status: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        return;
      }
    }

    try {
      await aiIndexService.putManaged(id, properties);
      logger.info(`AI index '${id}' registered successfully`);
    } catch (err) {
      if (err instanceof InvalidAiIndexDestError) {
        logger.warn(
          `AI index '${id}' dest is not ready (backing index may not exist yet): ${err.message}. ` +
            `Registration will be retried on next Kibana restart.`
        );
      } else {
        logger.warn(
          `Failed to register AI index '${id}': ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
}
