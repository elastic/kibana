/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatEvent,
  ConversationSourceType,
  OriginProjection,
} from '@kbn/agent-builder-common';

/**
 * Produces the output of one conversation origin from chat events.
 */
export interface OriginAdapter<T extends ConversationSourceType = ConversationSourceType> {
  type: T;
  /**
   * Returns the origin output for the event, or `undefined` when it has none.
   */
  project: (event: ChatEvent) => OriginProjection[T] | undefined;
}
