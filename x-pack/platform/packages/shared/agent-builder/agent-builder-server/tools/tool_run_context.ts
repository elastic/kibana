/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentFromRunContext } from '../runner/run_context_utils';
import type { ToolHandlerContext } from './handler';

export interface ToolRunContext {
  conversationId?: string;
  /** The root execution of the run's tree, so a sub-agent reads under the execution its root started. */
  executionId?: string;
}

/** Reads ids from server-side context only, never tool arguments. Undefined outside an agent run. */
export const getToolRunContext = ({
  runContext,
}: Pick<ToolHandlerContext, 'runContext'>): ToolRunContext | undefined => {
  const agent = getAgentFromRunContext(runContext);
  if (!agent?.conversationId && !agent?.rootExecutionId) {
    return undefined;
  }
  return {
    ...(agent.conversationId ? { conversationId: agent.conversationId } : {}),
    ...(agent.rootExecutionId ? { executionId: agent.rootExecutionId } : {}),
  };
};
