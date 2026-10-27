/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AiIndexProperties } from '../../common/http_api/ai_indices';
import type { AiIndexService } from './service';
import { AiIndexConflictError } from './errors';

export interface AiIndexRegistrationOptions {
  /** Hides the entry from reads while it resolves to `false`. */
  isAvailable?: () => Promise<boolean>;
}

export class AiIndexRegistry {
  private readonly entries = new Map<string, AiIndexProperties>();
  private readonly availabilityChecks = new Map<string, () => Promise<boolean>>();
  private frozen = false;

  register(id: string, properties: AiIndexProperties, options?: AiIndexRegistrationOptions): void {
    if (this.frozen) {
      throw new Error('registerAiIndex called after plugin setup');
    }
    if (this.entries.has(id)) {
      throw new Error(`AI index '${id}' is already registered`);
    }
    this.entries.set(id, properties);
    if (options?.isAvailable) {
      this.availabilityChecks.set(id, options.isAvailable);
    }
  }

  /** Ids of managed AI indices that are currently hidden. */
  async getUnavailableIds(): Promise<Set<string>> {
    const results = await Promise.all(
      [...this.availabilityChecks].map(async ([id, isAvailable]) =>
        (await isAvailable().catch(() => false)) ? undefined : id
      )
    );
    return new Set(results.filter((id): id is string => id !== undefined));
  }

  /** Marks setup complete; further `register()` calls are rejected. */
  freeze(): void {
    this.frozen = true;
  }

  /** Ids of managed AI indices registered by plugins at setup. */
  getManagedIds(): string[] {
    return [...this.entries.keys()];
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  get(id: string): AiIndexProperties | undefined {
    return this.entries.get(id);
  }

  /**
   * Idempotent upsert of one managed entry into one space. Safe to call on
   * every access.
   */
  async ensure({
    id,
    spaceId,
    aiIndexService,
    logger,
  }: {
    id: string;
    spaceId: string;
    aiIndexService: AiIndexService;
    logger: Logger;
  }): Promise<void> {
    const properties = this.entries.get(id);
    if (!properties) {
      return;
    }
    try {
      const result = await aiIndexService.putManaged(id, spaceId, properties);
      logger.debug(`AI index '${id}' ${result} in space '${spaceId}'`);
    } catch (err) {
      if (err instanceof AiIndexConflictError) {
        logger.debug(
          `AI index '${id}' was registered concurrently in space '${spaceId}' — skipping.`
        );
        return;
      }
      throw err;
    }
  }
}
