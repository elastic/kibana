/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchesFilter } from './filter';
import type { ListenerDefinition, RouterEvent } from './types';

/**
 * Holds every listener on every node. Candidates are indexed by event type so
 * that a burst of events nobody subscribes to costs a single map lookup.
 */
export class ListenerRegistry {
  private readonly listeners = new Map<string, ListenerDefinition>();
  private readonly byType = new Map<string, ListenerDefinition[]>();

  public register(definition: ListenerDefinition): void {
    const { id, filter } = definition;

    if (this.listeners.has(id)) {
      throw new Error(`Listener "${id}" is already registered`);
    }

    if (filter.types.length === 0) {
      throw new Error(`Listener "${id}" must subscribe to at least one event type`);
    }

    this.listeners.set(id, definition);

    for (const type of new Set(filter.types)) {
      const candidates = this.byType.get(type);
      if (candidates) {
        candidates.push(definition);
      } else {
        this.byType.set(type, [definition]);
      }
    }
  }

  public match(event: RouterEvent): ListenerDefinition[] {
    const candidates = this.byType.get(event.type);

    if (!candidates) {
      return [];
    }

    return candidates.filter((listener) => matchesFilter(listener.filter, event));
  }

  public getIds(): string[] {
    return [...this.listeners.keys()];
  }

  public getSubscribedTypes(): string[] {
    return [...this.byType.keys()];
  }
}
