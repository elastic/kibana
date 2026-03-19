/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  RunContext,
  RunAgentStackEntry,
  RunToolStackEntry,
} from '@kbn/agent-builder-server/runner';
import type { ToolCallSource } from '@kbn/agent-builder-server/runner/runner';

export const createEmptyRunContext = ({
  runId = uuidv4(),
}: { runId?: string } = {}): RunContext => {
  return {
    runId,
    stack: [],
  };
};

export const createToolStackEntry = (props: Omit<RunToolStackEntry, 'type'>): RunToolStackEntry => {
  return { type: 'tool', ...props };
};

export const forkContextForToolRun = ({
  parentContext,
  ...toolEntry
}: {
  toolId: string;
  toolCallId?: string;
  source?: ToolCallSource;
  parentContext: RunContext;
}): RunContext => {
  return {
    ...parentContext,
    stack: [...parentContext.stack, createToolStackEntry(toolEntry)],
  };
};

const createAgentStackEntry = (props: Omit<RunAgentStackEntry, 'type'>): RunAgentStackEntry => {
  return { type: 'agent', ...props };
};

export const forkContextForAgentRun = ({
  parentContext,
  ...agentEntry
}: {
  agentId: string;
  conversationId?: string;
  executionId?: string;
  parentContext: RunContext;
}): RunContext => {
  return {
    ...parentContext,
    stack: [...parentContext.stack, createAgentStackEntry(agentEntry)],
  };
};
