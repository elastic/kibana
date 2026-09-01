/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WithRequiredProperty } from '@kbn/utility-types';
import type { ApiTarget } from '../apis';
import { apiTargets } from '../apis';
import { matchesApiSelector } from '../apis/known_apis';
import { AgentExecutionMode } from './execution_mode';

export interface AutoApprovedApi {
  target: ApiTarget;
  api: string;
}

/**
 * Interactivity configuration - defines behavior for features that require a live user.
 */
export interface InteractivityConfigInput {
  /**
   * When false, features that require a live user (HITL prompts,
   * `ask_user_question`) are disabled — either via auto-decline (tools that
   * emit prompts) or via tool-registration gating.
   */
  enabled?: boolean;
  /**
   * Destructive APIs pre-approved for this execution.
   */
  auto_approved_apis?: AutoApprovedApi[];
}

/**
 * Interactivity configuration once a run has resolved it. Every consumer downstream of
 * {@link normalizeInteractive} reads `enabled` without re-applying a default.
 */
export type InteractivityConfig = WithRequiredProperty<InteractivityConfigInput, 'enabled'>;

/**
 * Resolve interactivity for a run, determining `enabled` from the execution mode.
 *
 * @param input - Caller-supplied config
 * @param executionMode - Mode the run executes in, which determines the `enabled` default.
 * @returns A config whose `enabled` is always set.
 */
export const normalizeInteractive = (
  input: InteractivityConfigInput | undefined,
  executionMode: AgentExecutionMode
): InteractivityConfig => ({
  ...input,
  enabled: input?.enabled ?? executionMode === AgentExecutionMode.conversation,
});

/**
 * Determines whether a destructive API call is covered by the run's pre-approvals.
 *
 * @param interactivity - Canonical interactivity config for the run.
 * @param target - Backend the API belongs to.
 * @param api - Exact API identifier, as passed to `execute_api`.
 * @returns True when a grant on the same target covers that API, whether exactly or by wildcard.
 */
export const isApiAutoApproved = ({
  interactivity,
  target,
  api,
}: {
  interactivity: InteractivityConfigInput;
  target: ApiTarget;
  api: string;
}): boolean =>
  (interactivity.auto_approved_apis ?? []).some(
    (approved) => approved.target === target && matchesApiSelector(approved.api, api)
  );

/**
 * Transforms the per-target API map into flat {@link AutoApprovedApi} pairs.
 *
 * @param apisByTarget - Granted selectors keyed by backend.
 * @returns One entry per granted selector, grouped by target in {@link apiTargets} order.
 */
export const toAutoApprovedApis = (
  apisByTarget: Partial<Record<ApiTarget, readonly string[]>>
): AutoApprovedApi[] =>
  apiTargets.flatMap((target) => (apisByTarget[target] ?? []).map((api) => ({ target, api })));

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
