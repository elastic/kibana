/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createConversationTask, type ConversationTaskOptions } from './conversation_task';
export {
  runConversation,
  ConversationRunError,
  DEFAULT_MAX_TURNS,
  type RunConversationParams,
} from './run_conversation';
export {
  agentBuilderTarget,
  inferenceTarget,
  type AgentBuilderTargetOptions,
  type InferenceTargetOptions,
} from './targets';
export { createSimulatedUser, type SimulatedUserOptions } from './simulated_user';
export { answerPromptsWithNextTurn } from './prompt_responses';
export {
  forTurn,
  forFinalTurn,
  acrossTurns,
  forConversation,
  createConversationCompletedEvaluator,
  isMultiTurnResult,
  overallExpectation,
  type AcrossTurnsOptions,
  type TurnScoreAggregate,
} from './turn_evaluators';
export type {
  ConversationInput,
  ConversationMessage,
  ConversationResult,
  ConversationStopReason,
  ConversationTarget,
  ConversationTurnExpectation,
  ConversationTurnInput,
  ConversationTurnResult,
  MultiTurnError,
  MultiTurnExample,
  MultiTurnExpected,
  MultiTurnHooks,
  MultiTurnInput,
  MultiTurnResult,
  MultiTurnTaskContext,
  NextMessageContext,
  NextMessageFn,
  ReconcileOutcome,
  RespondToPromptsFn,
  SimulatedUserInput,
  TargetConversation,
  TargetTurnReply,
  TargetTurnRequest,
} from './types';
