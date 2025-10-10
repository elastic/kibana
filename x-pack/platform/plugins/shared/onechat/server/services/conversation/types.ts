/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  ToolCallWithResult,
  ConversationRoundStepMixin,
  ReasoningStep,
  ConversationRoundStepType,
} from '@kbn/onechat-common/chat/conversation';

/**
 * A version of ToolCallWithResult where 'results' is a serialized string.
 */
export type PersistentToolCallWithResult = Omit<ToolCallWithResult, 'results'> & {
  results: string;
};

/**
 * A version of ToolCallStep suitable for persistence.
 */
export type PersistentToolCallStep = ConversationRoundStepMixin<
  ConversationRoundStepType.toolCall,
  PersistentToolCallWithResult
>;

/**
 * A union of all possible persistent step types.
 */
export type PersistentConversationRoundStep = PersistentToolCallStep | ReasoningStep;

/**
 * Represents a conversation round suitable for persistence, with tool
 * call results serialized to a string.
 */
export type PersistentConversationRound = Omit<ConversationRound, 'steps'> & {
  steps: PersistentConversationRoundStep[];
};
