/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import pRetry from 'p-retry';

type Messages = { message: string; prompts?: PromptRequest[] }[];

interface PromptRequest {
  id: string;
  type: string;
  title?: string;
  message?: string;
  color?: string;
  confirm_text?: string;
  cancel_text?: string;
}

interface Options {
  agentId?: string;
}

interface ConverseFunctionParams {
  messages: Messages;
  conversationId?: string;
  options?: Options;
}

type ConverseFunction = (params: ConverseFunctionParams) => Promise<{
  conversationId?: string;
  messages: Messages;
  errors: any[];
  steps?: any[];
  // The agent_builder server's `mergeRounds` flattens the per-round
  // `trace_id` into `string[]` when a conversation spans multiple
  // HITL-prompt-resume rounds (add_round_complete_event.ts:209-219). Surface
  // the union honestly so evaluators that query traces don't string-interp
  // an array into an ES|QL literal (which silently matches 0 spans).
  traceId?: string | string[];
}>;

// Cap how many sequential auto-confirmations we issue per question. Three
// pending prompts in a row almost certainly means the agent is in a loop or
// the user explicitly disabled this side-channel — bail out and let the
// evaluators score whatever final state we have.
const MAX_AUTO_CONFIRM_ROUNDS = 3;

interface ExecuteToolParams {
  toolId: string;
  toolParams: Record<string, unknown>;
  connectorId?: string;
}

interface ExecuteToolResult {
  results: unknown[];
  errors: any[];
}

export class AgentBuilderEvaluationChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  private async executeWithRetry<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    return pRetry(fn, {
      retries: 2,
      minTimeout: 2000,
      onFailedAttempt: (error) => {
        const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

        if (isLastAttempt) {
          this.log.error(
            new Error(`Failed to call ${operationName} API after ${error.attemptNumber} attempts`, {
              cause: error,
            })
          );
          throw error;
        } else {
          this.log.warning(
            new Error(
              `${operationName} API call failed on attempt ${error.attemptNumber}; retrying...`,
              { cause: error }
            )
          );
        }
      },
    });
  }

  converse: ConverseFunction = async ({ messages, conversationId, options = {} }) => {
    this.log.info('Calling converse');

    const { agentId = agentBuilderDefaultAgentId } = options;

    // One round-trip to /api/agent_builder/converse. Returns whatever the
    // server gave us — including pending HITL prompts on the latest message.
    const callConverseApi = async ({
      input,
      conversationIdForRound,
      promptAnswers,
    }: {
      input: string;
      conversationIdForRound?: string;
      promptAnswers?: Record<string, { allow: boolean }>;
    }): Promise<{
      conversationId?: string;
      latestResponse: { message: string; prompts?: PromptRequest[] };
      steps: any[];
      traceId?: string | string[];
    }> => {
      const body: Record<string, unknown> = {
        agent_id: agentId,
        connector_id: this.connectorId,
        conversation_id: conversationIdForRound,
        input,
      };
      if (promptAnswers && Object.keys(promptAnswers).length > 0) {
        body.prompts = promptAnswers;
      }

      const response = await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify(body),
      });

      const chatResponse = response as {
        conversation_id: string;
        // Per add_round_complete_event.ts:209-219 the server returns
        // `string | string[] | undefined`. Pass it through verbatim.
        trace_id?: string | string[];
        steps: any[];
        response: { message: string; prompts?: PromptRequest[] };
      };

      return {
        conversationId: chatResponse.conversation_id,
        latestResponse: chatResponse.response,
        steps: chatResponse.steps ?? [],
        traceId: chatResponse.trace_id,
      };
    };

    // Auto-allows any HITL confirmation prompts the agent surfaces so the
    // evaluation loop reflects "would the agent succeed if the user said
    // yes?", not "did the agent get stuck on an unanswered prompt?". The
    // server route enforces its own policy (`prompts: Record<id, {allow:
    // boolean}>`) — this side just keeps replaying with `allow: true` until
    // the agent emits a final, prompt-free message. Capped at
    // MAX_AUTO_CONFIRM_ROUNDS to avoid runaway loops.
    //
    // The agent_builder converse route returns `round.steps` — the *current
    // round's* steps. On a prompt-resume call the same round continues, so
    // subsequent responses may re-include earlier steps. We dedupe by the
    // `(type, tool_call_id)` pair to keep code evaluators (Tool_Calls,
    // Workflow_*, etc.) from double-counting. Multiple sibling steps in the
    // same round share the same `tool_call_id` (e.g. a `reasoning` step and
    // its paired `tool_call` step), so the type discriminator is required.
    const driveConversationWithAutoConfirm = async () => {
      const initialInput = messages[messages.length - 1].message;
      const seenStepKeys = new Set<string>();
      const aggregatedSteps: any[] = [];
      // The server may already return an array on a single round (if its
      // own merge happened before responding). Preserve that shape so
      // downstream evaluators can match against every round-trace.
      let aggregatedTraceId: string | string[] | undefined;
      let activeConversationId = conversationId;
      let pendingInput: string = initialInput;
      let pendingPromptAnswers: Record<string, { allow: boolean }> | undefined;
      let latestResponse: { message: string; prompts?: PromptRequest[] } = { message: '' };

      const mergeSteps = (incoming: any[]): void => {
        for (const step of incoming) {
          const type = typeof step?.type === 'string' ? step.type : '';
          const id = typeof step?.tool_call_id === 'string' ? step.tool_call_id : '';
          // Steps without a tool_call_id (e.g. retrieval, system events) are
          // appended unconditionally — losing identity is preferable to
          // dropping legitimate steps and breaking the evaluators that
          // consume them.
          const key = id ? `${type}:${id}` : '';
          if (key && seenStepKeys.has(key)) continue;
          if (key) seenStepKeys.add(key);
          aggregatedSteps.push(step);
        }
      };

      for (let round = 0; round <= MAX_AUTO_CONFIRM_ROUNDS; round++) {
        const result = await this.executeWithRetry('converse', () =>
          callConverseApi({
            input: pendingInput,
            conversationIdForRound: activeConversationId,
            promptAnswers: pendingPromptAnswers,
          })
        );

        activeConversationId = result.conversationId ?? activeConversationId;
        mergeSteps(result.steps);
        // Prefer the most recent traceId so evaluators key off the final round.
        aggregatedTraceId = result.traceId ?? aggregatedTraceId;
        latestResponse = result.latestResponse;

        const prompts = latestResponse.prompts ?? [];
        if (prompts.length === 0) break;

        if (round === MAX_AUTO_CONFIRM_ROUNDS) {
          this.log.warning(
            `Auto-confirm gave up after ${MAX_AUTO_CONFIRM_ROUNDS} rounds; ` +
              `agent still requesting ${prompts.length} prompt(s).`
          );
          break;
        }

        this.log.info(
          `Auto-confirming ${prompts.length} HITL prompt(s): ${prompts
            .map((p) => p.id)
            .join(', ')}`
        );
        pendingPromptAnswers = Object.fromEntries(prompts.map((p) => [p.id, { allow: true }]));
        // Resuming a HITL prompt does not require new user text; the empty
        // input pairs with `prompts` on the next call.
        pendingInput = '';
      }

      return {
        conversationId: activeConversationId,
        messages: [...messages, latestResponse],
        steps: aggregatedSteps,
        traceId: aggregatedTraceId,
        errors: [],
      };
    };

    try {
      return await driveConversationWithAutoConfirm();
    } catch (error) {
      this.log.error('Error occurred while calling converse API');
      return {
        conversationId,
        steps: [],
        messages: [
          ...messages,
          {
            message:
              'This question could not be answered as an internal error occurred. Please try again.',
          },
        ],
        errors: [
          {
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            type: 'error',
          },
        ],
      };
    }
  };

  executeTool = async ({
    toolId,
    toolParams,
    connectorId,
  }: ExecuteToolParams): Promise<ExecuteToolResult> => {
    this.log.info(`Calling executeTool for ${toolId}`);

    const callExecuteToolApi = async (): Promise<ExecuteToolResult> => {
      const response = await this.fetch('/api/agent_builder/tools/_execute', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          tool_id: toolId,
          tool_params: toolParams,
          connector_id: connectorId ?? this.connectorId,
        }),
      });

      const toolResponse = response as { results: unknown[] };
      return {
        results: toolResponse.results,
        errors: [],
      };
    };

    try {
      return await this.executeWithRetry('executeTool', callExecuteToolApi);
    } catch (error) {
      this.log.error('Error occurred while calling executeTool API');
      return {
        results: [],
        errors: [
          {
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            type: 'error',
          },
        ],
      };
    }
  };
}
