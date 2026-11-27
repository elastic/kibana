/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';
import { MessageRole, type BoundInferenceClient, type Message } from '@kbn/inference-common';
import type {
  AgentBuilderClient,
  AgentBuilderClientResponse,
  ConverseStep,
} from '../utils/agent_builder_client';
import type {
  ConversationTarget,
  ReconcileOutcome,
  TargetConversation,
  TargetTurnReply,
  TargetTurnRequest,
} from './types';

const DEFAULT_RECONCILE_TIMEOUT_MS = 120_000;
const RECONCILE_POLL_INTERVAL_MS = 2_000;

/** The parts of a stored Agent Builder round the reconcile step reads. */
interface StoredRound {
  status?: 'in_progress' | 'completed' | 'awaiting_prompt';
  pending_prompts?: Array<{ id?: string }>;
  steps?: ConverseStep[];
  response?: { message?: string };
  trace_id?: string | string[];
}

const toTraceIds = (traceId: string | string[] | undefined): string[] =>
  (Array.isArray(traceId) ? traceId : [traceId]).filter((id): id is string => Boolean(id));

const fromConverse = (response: AgentBuilderClientResponse): TargetTurnReply => ({
  response: response.message,
  steps: response.steps,
  prompts: response.prompts ?? [],
  traceIds: response.traceIds ?? toTraceIds(response.traceId),
  tokensUsed: response.tokensUsed,
});

const fromStoredRound = (round: StoredRound): TargetTurnReply => ({
  response: round.response?.message ?? '',
  steps: round.steps ?? [],
  prompts: round.status === 'awaiting_prompt' ? round.pending_prompts ?? [] : [],
  traceIds: toTraceIds(round.trace_id),
});

const promptIds = (prompts: readonly unknown[] | undefined): string =>
  (prompts ?? [])
    .map((prompt) => (prompt as { id?: unknown } | null)?.id)
    .filter((id): id is string => typeof id === 'string')
    .sort()
    .join(',');

export interface AgentBuilderTargetOptions {
  client: Pick<AgentBuilderClient, 'converse' | 'createConversation' | 'getConversation'>;
  agentId: string;
  /** How long a failed turn is checked against the stored conversation before giving up. */
  reconcileTimeoutMs?: number;
}

/**
 * An Agent Builder agent. Each conversation is created up front, so its id is known even if the
 * first turn fails. Turns are sent once, never retried: when a call fails, the stored conversation
 * tells whether the turn was applied, and its reply is read back from there.
 */
export const agentBuilderTarget = ({
  client,
  agentId,
  reconcileTimeoutMs = DEFAULT_RECONCILE_TIMEOUT_MS,
}: AgentBuilderTargetOptions): ConversationTarget => ({
  name: `agent-builder:${agentId}`,
  startConversation: async ({ key, context }) => {
    const { id } = await client.createConversation({
      agentId,
      title: `evals · ${context.example.id ?? `example ${context.exampleIndex ?? 0}`} · ${key}`,
    });
    // Rounds the conversation holds; a new message adds one, a prompt answer resumes the last.
    let knownRounds = 0;
    let pendingPromptIds = '';

    const conversation: TargetConversation = {
      id,
      send: async ({ turn, promptResponses }: TargetTurnRequest) => {
        const response = await client.converse({
          agentId,
          input: turn.message,
          conversationId: id,
          ...(promptResponses ? { promptResponses } : {}),
          ...(turn.attachments ? { attachments: turn.attachments } : {}),
          retry: false,
        });
        if (!promptResponses) {
          knownRounds += 1;
        }
        pendingPromptIds = promptIds(response.prompts);
        return fromConverse(response);
      },
      reconcile: async ({ promptResponses }: TargetTurnRequest): Promise<ReconcileOutcome> => {
        const roundIndex = promptResponses ? knownRounds - 1 : knownRounds;
        const deadline = Date.now() + reconcileTimeoutMs;

        while (Date.now() < deadline) {
          const { rounds = [] } = await client.getConversation<{ rounds?: StoredRound[] }>(id);
          const round = rounds[roundIndex];

          if (!round) {
            return 'not_applied';
          }
          const stillAwaitingSamePrompt =
            promptResponses &&
            round.status === 'awaiting_prompt' &&
            promptIds(round.pending_prompts) === pendingPromptIds;
          if (stillAwaitingSamePrompt) {
            return 'not_applied';
          }
          if (round.status !== 'in_progress') {
            if (!promptResponses) {
              knownRounds += 1;
            }
            pendingPromptIds = promptIds(round.pending_prompts);
            return fromStoredRound(round);
          }

          await sleep(RECONCILE_POLL_INTERVAL_MS);
        }

        return 'unknown';
      },
    };

    return conversation;
  },
});

export interface InferenceTargetOptions {
  inferenceClient: BoundInferenceClient;
  /** System prompt for the model under evaluation. */
  system?: string;
  name?: string;
}

/**
 * A model called directly through a Kibana connector or an Elasticsearch inference endpoint.
 * The target keeps the message history and sends all of it on every turn.
 */
export const inferenceTarget = ({
  inferenceClient,
  system,
  name = 'inference',
}: InferenceTargetOptions): ConversationTarget => ({
  name,
  startConversation: async () => {
    const messages: Message[] = [];

    return {
      send: async ({ turn }: TargetTurnRequest) => {
        const userMessage: Message = { role: MessageRole.User, content: turn.message };
        const response = await inferenceClient.chatComplete({
          ...(system ? { system } : {}),
          messages: [...messages, userMessage],
        });
        messages.push(userMessage, { role: MessageRole.Assistant, content: response.content });
        return {
          response: response.content,
          steps: [],
          prompts: [],
          traceIds: [],
          tokensUsed: response.tokens,
        };
      },
      // A model call changes no state, so a failed one can always be sent again.
      reconcile: async () => 'not_applied',
    };
  },
});
