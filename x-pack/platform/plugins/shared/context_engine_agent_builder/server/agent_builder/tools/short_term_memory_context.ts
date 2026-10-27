/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ShortTermMemory } from '@kbn/agent-builder-common';
import {
  getAgentFromRunContext,
  type ScopedShortTermMemoryClient,
  type ToolHandlerContext,
} from '@kbn/agent-builder-server';

/** The memory of the user the run acts for, which the Agent Builder runner provides. */
export const getShortTermMemoryClient = ({
  getShortTermMemoryClient: getClient,
}: Pick<ToolHandlerContext, 'getShortTermMemoryClient'>): Promise<ScopedShortTermMemoryClient> => {
  if (!getClient) {
    throw new Error('Short-term memory is not available for this tool call.');
  }
  return getClient();
};

/** Agent id recorded for memories written over MCP, where no Agent Builder agent runs. */
export const MCP_MEMORY_AGENT_ID = 'mcp';

/** The agent whose memory a tool call reads and writes. Never taken from the model. */
export const resolveMemoryAgentId = ({ runContext }: Pick<ToolHandlerContext, 'runContext'>) =>
  getAgentFromRunContext(runContext)?.agentId ?? MCP_MEMORY_AGENT_ID;

/**
 * The session a write belongs to: the conversation in Agent Builder, or for MCP the id the client
 * got back from an earlier call, else a new one. `undefined` when the call is neither.
 */
export const resolveMemorySessionId = ({
  runContext,
  callContext,
  requestedSessionId,
  generateSessionId,
}: Pick<ToolHandlerContext, 'runContext' | 'callContext'> & {
  requestedSessionId?: string;
  generateSessionId: () => string;
}): string | undefined => {
  const conversationId = getAgentFromRunContext(runContext)?.conversationId || undefined;
  if (conversationId) {
    return conversationId;
  }
  if (callContext?.callSource !== 'mcp') {
    return undefined;
  }
  return requestedSessionId ?? generateSessionId();
};

/** The memory as handed back to the model. Owner and promotion details stay server-side. */
export const toMemoryToolResult = ({
  id,
  type,
  title,
  description,
  content,
  tags,
  updated_at: updatedAt,
  expires_at: expiresAt,
}: ShortTermMemory) => ({
  id,
  type,
  title,
  description,
  content,
  tags,
  updated_at: updatedAt,
  ...(expiresAt !== undefined && { expires_at: expiresAt }),
});
