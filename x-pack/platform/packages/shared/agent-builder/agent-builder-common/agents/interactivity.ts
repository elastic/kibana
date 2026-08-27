/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiTarget } from '../apis';
import { AgentExecutionMode } from './execution_mode';

export interface AutoApprovedApi {
  target: ApiTarget;
  api: string;
}

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
  /**
   * Destructive APIs pre-approved for this execution.
   */
  auto_approved_apis?: AutoApprovedApi[];
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

/**
 * Determines whether a destructive API call is covered by the run's pre-approvals.
 *
 * @param interactivity - Canonical interactivity config for the run.
 * @param target - Backend the API belongs to.
 * @param api - API identifier, as passed to `execute_api`.
 * @returns True when the config pre-approves this exact target and API pair.
 */
export const isApiAutoApproved = ({
  interactivity,
  target,
  api,
}: {
  interactivity: InteractivityConfig;
  target: ApiTarget;
  api: string;
}): boolean =>
  (interactivity.auto_approved_apis ?? []).some(
    (approved) => approved.target === target && approved.api === api
  );

/**
 * Builds the interactivity config for runs with no live user, carrying over pre-approved APIs.
 *
 * @param autoApprovedApis - Destructive APIs pre-approved for the run.
 * @returns A disabled interactivity config.
 */
export const createNonInteractiveConfig = (
  autoApprovedApis?: AutoApprovedApi[]
): InteractivityConfig => ({
  enabled: false,
  ...(autoApprovedApis?.length ? { auto_approved_apis: autoApprovedApis } : {}),
});
