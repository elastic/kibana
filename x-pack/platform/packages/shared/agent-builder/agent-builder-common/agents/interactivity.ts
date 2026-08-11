/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode } from './execution_mode';

/**
 * Canonical interactivity configuration used everywhere downstream of the
 * executeAgent entry point. The public API accepts `boolean | InteractivityConfig`
 * for ergonomics; the boundary normalizes to this shape.
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
 * Ergonomic input form accepted by the public API. Normalized to
 * `InteractivityConfig` at the boundary.
 */
export type InteractiveInput = boolean | InteractivityConfig;

/**
 * Normalize the ergonomic input form to the canonical config.
 * Defaults derive from execution mode when the caller omits `interactive`:
 * - `AgentExecutionMode.conversation` → { enabled: true }
 * - `AgentExecutionMode.standalone`   → { enabled: false }
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
