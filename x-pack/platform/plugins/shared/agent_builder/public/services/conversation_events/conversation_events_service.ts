/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertValidConversationEventType } from '@kbn/agent-builder-common';
import type { ConversationEventUIDefinition } from '@kbn/agent-builder-browser';

/**
 * Internal service maintaining a registry of conversation event UI definitions, keyed by event
 * type. Registration must happen during the consumer plugin's `start()` lifecycle, before any
 * conversation timeline mounts; the registry is a plain `Map` with no observability.
 *
 * The compile-time type guard (`ValidConversationEventType`) lives on the public contract's
 * `register` — not here. This service relies on runtime validation via
 * `assertValidConversationEventType` as its second line of defense.
 */
export class ConversationEventsService {
  private readonly registry: Map<string, ConversationEventUIDefinition> = new Map();

  /**
   * Registers a UI definition for a custom conversation event type.
   *
   * @param definition - The UI definition; the event type is taken from `definition.type`.
   * @throws Error if the type is already registered, contains the id delimiter, is reserved, or
   *   shadows a built-in timeline event type.
   */
  register<TType extends string, TData>(
    definition: ConversationEventUIDefinition<TType, TData>
  ): void {
    if (this.registry.has(definition.type)) {
      throw new Error(`Conversation event type "${definition.type}" is already registered.`);
    }
    assertValidConversationEventType(definition.type);
    this.registry.set(definition.type, definition as unknown as ConversationEventUIDefinition);
  }

  /**
   * Retrieves the UI definition for a conversation event type, or `undefined` if none is
   * registered.
   */
  getUiDefinition(type: string): ConversationEventUIDefinition | undefined {
    return this.registry.get(type);
  }

  /**
   * Returns `true` if a UI definition is registered for the given event type.
   */
  has(type: string): boolean {
    return this.registry.has(type);
  }

  /**
   * Returns all registered UI definitions in insertion order.
   */
  list(): ConversationEventUIDefinition[] {
    return [...this.registry.values()];
  }
}
