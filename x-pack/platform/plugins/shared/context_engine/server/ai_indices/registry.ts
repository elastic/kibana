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

interface AiIndexRegistration {
  properties: AiIndexProperties;
  /** If true, creates as managed (immutable). If false, creates as seeded (user-editable). */
  managed: boolean;
}

export class AiIndexRegistry {
  private readonly entries = new Map<string, AiIndexRegistration>();
  private started = false;

  /**
   * Registers a managed AI index. Managed indices are owned by the plugin and
   * cannot be modified by users via the API.
   */
  register(id: string, properties: AiIndexProperties): void {
    this.registerInternal(id, properties, true);
  }

  /**
   * Registers a seeded AI index. Seeded indices are created with default
   * properties on first boot, but users can modify them (add automations,
   * change sources, etc.). The code-provided defaults are only applied if
   * the index doesn't already exist.
   */
  registerSeeded(id: string, properties: AiIndexProperties): void {
    this.registerInternal(id, properties, false);
  }

  private registerInternal(id: string, properties: AiIndexProperties, managed: boolean): void {
    if (this.started) {
      throw new Error('registerAiIndex called after plugin start');
    }
    if (this.entries.has(id)) {
      throw new Error(`AI index '${id}' is already registered`);
    }
    this.entries.set(id, { properties, managed });
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

    for (const [id, registration] of this.entries) {
      await this.registerOne({ id, registration, aiIndexService, logger });
    }
  }

  private async registerOne({
    id,
    registration,
    aiIndexService,
    logger,
  }: {
    id: string;
    registration: AiIndexRegistration;
    aiIndexService: AiIndexService;
    logger: Logger;
  }): Promise<void> {
    const { properties, managed } = registration;

    try {
      if (managed) {
        // Managed: idempotent upsert on every startup, code is the source of truth
        const result = await aiIndexService.putManaged(id, properties);
        if (result === 'created') {
          logger.info(`AI index '${id}' registered successfully (managed)`);
        } else {
          logger.debug(`AI index '${id}' registration refreshed (managed)`);
        }
      } else {
        // Seeded: create if new, migrate if managed, preserve if user-modified
        const result = await aiIndexService.putSeeded(id, properties);
        if (result === 'created') {
          logger.info(`AI index '${id}' seeded with defaults (user-editable)`);
        } else if (result === 'migrated') {
          logger.info(`AI index '${id}' migrated from managed to user-editable`);
        } else {
          logger.debug(`AI index '${id}' already exists — preserving user configuration`);
        }
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
