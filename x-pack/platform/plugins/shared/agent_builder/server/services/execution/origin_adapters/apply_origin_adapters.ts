/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity, map, type OperatorFunction } from 'rxjs';
import type { Logger } from '@kbn/logging';
import {
  isExecutionStartedEvent,
  isExecutionTerminalEvent,
  type ChatEvent,
  type ConversationRoundOrigin,
} from '@kbn/agent-builder-common';
import { getOriginAdapter } from './registry';

/**
 * Runs the adapter of the round's origin on every event, and adds its output to a copy of the
 * event under `projection`. Events pass through unchanged when the round has no origin,
 * or when the adapter has no output or throws, so a failing adapter never breaks the stream.
 */
export const applyOriginAdapters = ({
  origin,
  logger,
}: {
  origin: ConversationRoundOrigin | undefined;
  logger: Logger;
}): OperatorFunction<ChatEvent, ChatEvent> => {
  const adapter = origin ? getOriginAdapter(origin.type) : undefined;
  if (!adapter) {
    return identity;
  }

  return map((event) => {
    if (isExecutionStartedEvent(event) || isExecutionTerminalEvent(event)) {
      return event;
    }

    try {
      const output = adapter.project(event);

      if (!output) {
        return event;
      }

      return { ...event, projection: { ...event.projection, [adapter.type]: output } };
    } catch (error) {
      logger.warn(`Origin adapter "${adapter.type}" failed on "${event.type}" event: ${error}`);
      return event;
    }
  });
};
