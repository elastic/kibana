/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError, isBuiltInConversationEventType } from '@kbn/agent-builder-common';

import type { ConversationEventsServiceStart, ConversationEventAddInput, ValidatedConversationEventAddInput } from './types';

const validateEvent =
  (registry: Pick<ConversationEventsServiceStart, 'getDefinition'>) =>
  ({ type, data }: ConversationEventAddInput) => {
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
  events: ConversationEventAddInput[],
  registry: Pick<ConversationEventsServiceStart, 'getDefinition'>
): ValidatedConversationEventAddInput[] => {
  return events.map(validateEvent(registry));
};
