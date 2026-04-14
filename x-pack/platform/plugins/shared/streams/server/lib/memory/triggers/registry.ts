/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryUpdateTrigger, MemoryUpdateContext } from './types';

/**
 * Registry for memory update triggers. Triggers are invoked when specific events
 * occur (e.g. KI deletion, discovery completion) to update the memory knowledge base.
 */
export class MemoryTriggerRegistry {
  private readonly triggers = new Map<string, MemoryUpdateTrigger>();
  private readonly logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger.get('memory-triggers');
  }

  /**
   * Register a new trigger. Throws if a trigger with the same ID is already registered.
   */
  register(trigger: MemoryUpdateTrigger): void {
    if (this.triggers.has(trigger.id)) {
      throw new Error(`Memory trigger '${trigger.id}' is already registered`);
    }
    this.triggers.set(trigger.id, trigger);
    this.logger.debug(`Registered memory trigger: ${trigger.id}`);
  }

  /**
   * Execute a trigger by ID with the given context.
   * Errors are caught and logged — trigger failures should not break calling code.
   */
  async execute(
    triggerId: string,
    context: Omit<MemoryUpdateContext, 'trigger'> & {
      payload?: Record<string, unknown>;
    }
  ): Promise<void> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      this.logger.warn(`Unknown memory trigger: ${triggerId}`);
      return;
    }

    try {
      this.logger.debug(`Executing memory trigger: ${triggerId}`);
      await trigger.execute({
        ...context,
        trigger: {
          type: triggerId,
          payload: context.payload ?? {},
        },
      });
      this.logger.debug(`Memory trigger ${triggerId} completed successfully`);
    } catch (error) {
      this.logger.error(`Memory trigger ${triggerId} failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get all registered trigger IDs.
   */
  getRegisteredTriggers(): string[] {
    return Array.from(this.triggers.keys());
  }
}
