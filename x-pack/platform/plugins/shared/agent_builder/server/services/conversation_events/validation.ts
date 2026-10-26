/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createBadRequestError,
  isBuiltInConversationEventType,
  type ConversationAddEventInput,
} from '@kbn/agent-builder-common';

import type { ConversationEventsServiceStart } from './types';

const validateEvent =
  (registry: Pick<ConversationEventsServiceStart, 'getDefinition'>) =>
  ({ type, data }: ConversationAddEventInput) => {
    if (isBuiltInConversationEventType(type)) {
      throw createBadRequestError(
        `Conversation event type "${type}" is internal and cannot be added directly`
      );
    }

    const definition = registry.getDefinition(type);

    if (!definition) {
      throw createBadRequestError(`Unknown conversation event type "${type}"`);
    }

    const result = definition.payloadSchema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      throw createBadRequestError(`Invalid payload for event type "${type}": ${issues}`);
    }

    return {
      type,
      data: result.data,
    };
  };

export const validateConversationEvents = (
  events: ConversationAddEventInput[],
  registry: Pick<ConversationEventsServiceStart, 'getDefinition'>
): ConversationAddEventInput[] => {
  return events.map(validateEvent(registry));
};
