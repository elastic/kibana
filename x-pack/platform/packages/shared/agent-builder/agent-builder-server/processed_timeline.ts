/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEvent, TimelineEvent, UserMessageEvent } from '@kbn/agent-builder-common';
import type { ConversationEventRepresentation } from './conversation_events';
import type { ProcessedRoundInput } from './processed_input';

/** A `user_message` whose payload has been processed for the agent (attachments migrated to refs, context rendered). */
export type ProcessedUserMessageEvent = Omit<UserMessageEvent, 'data'> & {
  data: ProcessedRoundInput;
};

/** A custom conversation event with its LLM representation resolved. */
export type ProcessedCustomEvent = ConversationEvent & {
  representation: ConversationEventRepresentation;
};

/**
 * The agent-context timeline: normalized events, with `user_message` payloads processed and
 * custom events carrying their LLM representation.
 */
export type ProcessedTimelineEvent =
  | Exclude<TimelineEvent, UserMessageEvent>
  | ProcessedUserMessageEvent
  | ProcessedCustomEvent;
