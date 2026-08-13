/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode } from './execution_mode';

/**
 * Interactivity configuration - defines behavior for features that require a live user.
 *
 * For now only supporting disabled/enabled, but more will come soon.
 */
export interface InteractivityConfig {
  /**
   * When false, features that require a live user (HITL prompts,
   * `ask_user_question`) are disabled — either via auto-decline (tools that
   * emit prompts) or via tool-registration gating.
   */
  enabled: boolean;
}

export type InteractiveInput = boolean | InteractivityConfig;

/**
 * Normalize the ergonomic input form to the canonical config.
 */
export const normalizeInteractive = (
  input: InteractiveInput | undefined,
  executionMode: AgentExecutionMode
): InteractivityConfig => {
  if (input === undefined) {
    return { enabled: executionMode === AgentExecutionMode.conversation };
  }
  if (typeof input === 'boolean') {
    return { enabled: input };
  }
  return input;
};
