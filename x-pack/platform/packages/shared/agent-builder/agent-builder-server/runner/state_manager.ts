/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConversationStateManager {
  /**
   * Returns the tool state manager for the given tool call.
   */
  getToolStateManager(opts: { toolId: string; toolCallId?: string }): ToolStateManager;
}

/**
 * Tool state manager - Which can be used to persist state between executions of the tool.
 *
 * Note: state is bound to a tool call, and not shared between multiple calls to the same tool.
 */
export interface ToolStateManager {
  /**
   * Retrieve the state which was stored during the previous execution of the tool.
   * This is only useful when interrupting the tool to prompt the user,
   * to retrieve the state when the execution is resumed.
   */
  getState<T = unknown>(): T | undefined;

  /**
   * Persist the internal state of the tool execution, to be retrieved when execution is resumed.
   * This is only useful when interrupting the tool to prompt the user.
   */
  setState<T = unknown>(state: T): void;
}
