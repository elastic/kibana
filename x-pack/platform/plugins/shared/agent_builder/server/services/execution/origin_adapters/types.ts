/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatEvent,
  ConversationOriginType,
  ExecutionStartedEvent,
  ExecutionTerminalEvent,
  OriginProjection,
} from '@kbn/agent-builder-common';

/**
 * Chat events an origin adapter runs on. Execution lifecycle events are conversation timeline
 * events, which are persisted, so they never carry a projection.
 */
export type ProjectableChatEvent = Exclude<
  ChatEvent,
  ExecutionStartedEvent | ExecutionTerminalEvent
>;

/**
 * Output of one round origin: the value stored under its key in {@link OriginProjection}.
 */
export type OriginOutput<T extends ConversationOriginType> = NonNullable<OriginProjection[T]>;

/**
 * Produces the output of one round origin from chat events.
 */
export interface OriginAdapter<T extends ConversationOriginType = ConversationOriginType> {
  type: T;
  /**
   * Returns the origin output for the event, or `undefined` when it has none.
   */
  project: (event: ProjectableChatEvent) => OriginOutput<T> | undefined;
}
