/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode } from './execution_mode';

/**
 * Interactivity configuration - defines behavior for features that require a live user.
 */
export interface InteractivityConfig {
  /**
   * When false, features that require a live user (HITL prompts,
   * `ask_user_question`) are disabled — either via auto-decline (tools that
   * emit prompts) or via tool-registration gating.
   */
  enabled: boolean;
}

/**
 * Resolve interactivity for a run, defaulting from the execution mode when the
 * caller did not provide a config.
 */
export const normalizeInteractive = (
  input: InteractivityConfig | undefined,
  executionMode: AgentExecutionMode
): InteractivityConfig => {
  if (input === undefined) {
    return { enabled: executionMode === AgentExecutionMode.conversation };
  }
  return input;
};
