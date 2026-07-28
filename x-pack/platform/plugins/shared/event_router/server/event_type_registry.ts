/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidEventError, errorMessage } from './errors';
import type { EventTypeDefinition } from './types';

/**
 * Event types must be declared up front so that an unknown type is rejected at
 * the edge instead of being accepted and silently matching no listener.
 */
export class EventTypeRegistry {
  private readonly definitions = new Map<string, EventTypeDefinition>();

  public register(definition: EventTypeDefinition): void {
    const { type } = definition;

    if (type.trim().length === 0) {
      throw new Error('Event type must be a non-empty string');
    }

    if (this.definitions.has(type)) {
      throw new Error(`Event type "${type}" is already registered`);
    }

    this.definitions.set(type, definition);
  }

  public has(type: string): boolean {
    return this.definitions.has(type);
  }

  public getTypes(): string[] {
    return [...this.definitions.keys()];
  }

  /** Throws {@link InvalidEventError} when the type is unknown or the payload is invalid. */
  public validate(type: string, payload: unknown): void {
    const definition = this.definitions.get(type);

    if (!definition) {
      throw new InvalidEventError(`Unknown event type "${type}"`);
    }

    if (!definition.payloadSchema) {
      return;
    }

    try {
      definition.payloadSchema.validate(payload ?? {});
    } catch (error) {
      throw new InvalidEventError(
        `Invalid payload for event type "${type}": ${errorMessage(error)}`
      );
    }
  }
}
