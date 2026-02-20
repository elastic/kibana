/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Contract between a workflows and the before workflow hook:
 * - abort: when true, agent execution is aborted
 * - abort_message: message shown to the user when the workflow aborts the agent
 * - new_prompt: prompt to use for the next conversation round (replaces user message)
 */
export interface BeforeAgentWorkflowOutput {
  abort?: boolean;
  abort_message?: string;
  new_prompt?: string;
}
