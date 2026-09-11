/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TimelineEventType,
  userMessageEventDataSchema,
  promptResponseEventDataSchema,
  executionStartedEventDataSchema,
  executionStepEventDataSchema,
  executionTerminatedEventDataSchema,
  executionFailedEventDataSchema,
  executionAbortedEventDataSchema,
} from '@kbn/agent-builder-common';
import type { ConversationEventTypeDefinition } from '@kbn/agent-builder-server/conversation_events';

/** Returns the definitions for all built-in timeline event types. */
export const getBuiltinConversationEventTypes =
  (): ConversationEventTypeDefinition<TimelineEventType>[] => [
    { type: TimelineEventType.userMessage, payloadSchema: userMessageEventDataSchema },
    { type: TimelineEventType.promptResponse, payloadSchema: promptResponseEventDataSchema },
    { type: TimelineEventType.executionStarted, payloadSchema: executionStartedEventDataSchema },
    { type: TimelineEventType.executionStep, payloadSchema: executionStepEventDataSchema },
    {
      type: TimelineEventType.executionTerminated,
      payloadSchema: executionTerminatedEventDataSchema,
    },
    { type: TimelineEventType.executionFailed, payloadSchema: executionFailedEventDataSchema },
    { type: TimelineEventType.executionAborted, payloadSchema: executionAbortedEventDataSchema },
  ];
