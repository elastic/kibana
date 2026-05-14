/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPromptType, type FormPromptRequest } from '@kbn/agent-builder-common/agents';
import type { ChatResponse } from '../../../../../common/http_api/chat';
import { COMMON_HEADERS, ELASTIC_API_VERSION } from '../constants';

/** Headers for the versioned Workflows public API. */
export const WORKFLOWS_API_HEADERS = {
  ...COMMON_HEADERS,
  'elastic-api-version': ELASTIC_API_VERSION,
};

/** Headers for the versioned Inbox internal API. */
export const INBOX_API_HEADERS = {
  ...COMMON_HEADERS,
  'elastic-api-version': '1',
};

/**
 * Poll `fn` until `condition` returns true or the deadline is reached.
 * Throws with a descriptive message on timeout.
 */
export const pollUntil = async <T>(
  fn: () => Promise<T>,
  condition: (value: T) => boolean,
  { intervalMs = 500, timeoutMs = 30_000, label = 'condition' } = {}
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let last: T | undefined;
  while (Date.now() < deadline) {
    last = await fn();
    if (condition(last)) return last;
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`pollUntil timed out after ${timeoutMs}ms waiting for ${label}`);
};

/**
 * Convert a tool ID to the sanitized LangChain tool name that the agent uses
 * when calling the LLM. Dots are replaced with underscores; other non-word
 * characters are stripped. This must match `sanitizeToolId` from
 * `@kbn/agent-builder-genai-utils/langchain`.
 */
export const toLangchainToolName = (toolId: string): string =>
  toolId.replaceAll('.', '_').replace(/[^a-zA-Z0-9_-]/g, '');

/** YAML for a simple workflow that pauses at a `waitForInput` step. */
export const makeHitlWorkflowYaml = (name: string) =>
  `
name: ${name}
enabled: true
triggers:
  - type: manual
steps:
  - name: ask_approval
    type: waitForInput
    with:
      message: "Please approve this action"
      schema:
        type: object
        properties:
          approved:
            type: boolean
            title: Approve action
        required:
          - approved
  - name: log_result
    type: console
    with:
      message: "Approved: {{ steps.ask_approval.output.approved }}"
`.trim();

/** YAML for a two-step workflow that pauses at two sequential `waitForInput` steps. */
export const makeHitlTwoStepWorkflowYaml = (name: string) =>
  `
name: ${name}
enabled: true
triggers:
  - type: manual
steps:
  - name: ask_approval
    type: waitForInput
    with:
      message: "Please approve this action"
      schema:
        type: object
        properties:
          approved:
            type: boolean
            title: Approve action
        required:
          - approved
  - name: ask_confirmation
    type: waitForInput
    with:
      message: "Please confirm the action"
      schema:
        type: object
        properties:
          confirmed:
            type: boolean
            title: Confirm action
        required:
          - confirmed
  - name: log_result
    type: console
    with:
      message: "Approved: {{ steps.ask_approval.output.approved }}, Confirmed: {{ steps.ask_confirmation.output.confirmed }}"
`.trim();

/**
 * Return the first FormPromptRequest from a ChatResponse, asserting that
 * the round is in `awaitingPrompt` state.
 */
export const extractFormPrompt = (body: ChatResponse): FormPromptRequest => {
  const prompts = body.response.prompts ?? [];
  const formPrompt = prompts.find((p) => p.type === AgentPromptType.form);
  if (!formPrompt) {
    throw new Error(`Expected a form prompt in the response but found: ${JSON.stringify(prompts)}`);
  }
  return formPrompt as FormPromptRequest;
};

/**
 * Poll the Workflows execution API until the execution reaches a terminal
 * state. Returns the execution object.
 */
export const waitForExecutionTerminal = async (
  asAdmin: {
    get: (
      url: string,
      opts?: Record<string, unknown>
    ) => Promise<{ statusCode: number; body: unknown }>;
  },
  executionId: string
) => {
  const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);
  return pollUntil(
    () =>
      asAdmin.get(`/api/workflows/executions/${encodeURIComponent(executionId)}`, {
        headers: WORKFLOWS_API_HEADERS,
        responseType: 'json',
      }),
    (res) => {
      const status = (res.body as { status?: string }).status;
      return Boolean(status && TERMINAL.has(status));
    },
    { label: `execution ${executionId} to reach terminal status` }
  );
};
