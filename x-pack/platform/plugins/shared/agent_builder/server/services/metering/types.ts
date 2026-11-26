/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/inference-common';
import type {
  ConversationRoundStatus,
  ConversationRoundStep,
  RoundModelUsageStats,
} from '@kbn/agent-builder-common';

/**
 * The billed unit, defined as **conversational turn**: one input and its response,
 * charged one unit per 50k input tokens.
 * Billing calls this an "Agent Execution", but it is a whole round, not one of the executions a
 * round is made of: a turn paused for human input still bills exactly once, when it answers.
 */
export interface AgentExecutionUsage {
  agentId: string;
  executionId: string;
  conversationId?: string;
  modelProvider: ModelProvider;
  /** The owning round, not this execution. */
  roundId: string;
  roundCount: number;
  /** How many executions the turn took: 1 normally, more when it paused for human input. */
  executionCount: number;
  /** The turn's totals, across every execution. */
  usage: RoundModelUsageStats;
  status: ConversationRoundStatus;
  startedAt: string;
  timeToFirstToken: number;
  timeToLastToken: number;
  /** The turn's steps, across every execution. */
  steps: ConversationRoundStep[];
  messageLength: number;
  responseLength: number;
}
