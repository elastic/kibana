/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BusEvent, EventHandler } from './types';

interface EphemeralSubscription {
  id: string;
  types: Set<string>;
  handler: EventHandler;
}

interface DurableSubscription {
  consumer: string;
  types: string[];
  handler: EventHandler;
}

/**
 * In-process registry of this node's subscriptions. Ephemeral subscriptions are
 * driven by the shared node tail loop; durable subscriptions are looked up by
 * the durable consumer Task Manager task when it runs on this node.
 */
export class SubscriptionRegistry {
  private readonly ephemeral = new Map<string, EphemeralSubscription>();
  private readonly durable = new Map<string, DurableSubscription>();
  private sequence = 0;

  public addEphemeral(types: string[], handler: EventHandler): string {
    const id = `ephemeral-${this.sequence++}`;
    this.ephemeral.set(id, { id, types: new Set(types), handler });
    return id;
  }

  public removeEphemeral(id: string): void {
    this.ephemeral.delete(id);
  }

  public hasEphemeral(): boolean {
    return this.ephemeral.size > 0;
  }

  /** Union of all ephemeral subscribers' types, for the shared tail filter. */
  public ephemeralTypes(): string[] {
    const types = new Set<string>();
    for (const sub of this.ephemeral.values()) {
      for (const type of sub.types) {
        types.add(type);
      }
    }
    return [...types];
  }

  /**
   * Dispatches an event to every ephemeral subscriber interested in its type.
   * Handlers are isolated: a throwing/rejecting handler is logged and does not
   * prevent sibling handlers from running or the cursor from advancing.
   */
  public async dispatchEphemeral(event: BusEvent, logger: Logger): Promise<void> {
    for (const sub of this.ephemeral.values()) {
      if (!sub.types.has(event.type)) {
        continue;
      }
      try {
        await sub.handler(event);
      } catch (err) {
        logger.error(
          `event bus subscriber for "${event.type}" threw for event ${event.id}: ${err.message}`
        );
      }
    }
  }

  public registerDurable(consumer: string, types: string[], handler: EventHandler): void {
    this.durable.set(consumer, { consumer, types, handler });
  }

  public unregisterDurable(consumer: string): void {
    this.durable.delete(consumer);
  }

  public getDurable(consumer: string): DurableSubscription | undefined {
    return this.durable.get(consumer);
  }
}
