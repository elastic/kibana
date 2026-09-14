/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ConversationEvent, EventActor } from '@kbn/agent-builder-common';
import { createBadRequestError } from '@kbn/agent-builder-common';
import type { ConversationEventsServiceStart } from './types';

export interface ConversationEventAddInput {
  type: string;
  data: unknown;
}

/** Validates events against their registered type and stamps the server-assigned fields. */
export const materializeConversationEvents = ({
  inputs,
  registry,
  actor,
  now,
}: {
  inputs: ConversationEventAddInput[];
  registry: Pick<ConversationEventsServiceStart, 'getDefinition'>;
  actor: EventActor;
  now: Date;
}): ConversationEvent[] => {
  const materialized: ConversationEvent[] = [];

  // Validate every input before returning any, so a bad event rejects the whole batch.
  for (const { type, data } of inputs) {
    const definition = registry.getDefinition(type);

    if (!definition) {
      throw createBadRequestError(`Unknown conversation event type "${type}"`);
    }
    if (definition.internal) {
      throw createBadRequestError(
        `Conversation event type "${type}" is internal and cannot be added directly`
      );
    }

    const result = definition.payloadSchema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      throw createBadRequestError(`Invalid payload for event type "${type}": ${issues}`);
    }

    materialized.push({
      type,
      data: result.data,
      actor,
      id: uuidv4(),
      created_at: now.toISOString(),
    });
  }

  return materialized;
};
