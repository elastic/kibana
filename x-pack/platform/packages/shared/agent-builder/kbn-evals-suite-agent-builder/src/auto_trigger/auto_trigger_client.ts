/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { toHashedId } from '@kbn/agent-builder-server/telemetry';
import pRetry from 'p-retry';

export type AutoTriggerParticipant = 'bruno' | 'jane';
export type AutoTriggerAgentKey = 'elastic' | 'observability' | 'hr';

export interface AutoTriggerMessage {
  author: AutoTriggerParticipant;
  text: string;
  /** Sends the message with `trigger_mode: 'always'`, so a real agent reply follows it. */
  runAgent?: boolean;
}

/** What the `auto_trigger` and `decide` spans recorded for one decision. */
export interface AutoTriggerDecision {
  status: string;
  run: boolean;
  probability?: number;
  threshold?: number;
  inferenceId?: string;
  provider?: string;
  durationMs: number;
}

export interface AutoTriggerRunParams {
  agent: AutoTriggerAgentKey;
  history: AutoTriggerMessage[];
  author: AutoTriggerParticipant;
  message: string;
}

export interface AutoTriggerResult {
  conversationId: string;
  ran: boolean;
  requestMs: number;
  decision?: AutoTriggerDecision;
}

const PARTICIPANTS: Record<AutoTriggerParticipant, { username: string; fullName: string }> = {
  bruno: { username: 'auto_trigger_bruno', fullName: 'Bruno Farache' },
  jane: { username: 'auto_trigger_jane', fullName: 'Jane Doe' },
};

const AGENTS: Record<AutoTriggerAgentKey, { id: string; name: string; description: string }> = {
  elastic: {
    id: 'auto-trigger-elastic-ai-agent',
    name: 'Elastic AI Agent',
    description: 'Helps you investigate your data',
  },
  observability: {
    id: 'auto-trigger-observability-assistant',
    name: 'Observability Assistant',
    description: 'Investigates logs, metrics, traces and service health',
  },
  hr: {
    id: 'auto-trigger-hr-assistant',
    name: 'HR Assistant',
    description: 'Answers questions about leave, benefits and company policies',
  },
};

const PUBLIC_API_VERSION = '2023-10-31';
const FAST_MODEL_FEATURE_ID = 'agent_builder_fast';

interface ConversationEvent {
  type: string;
}

interface Conversation {
  id: string;
  events: ConversationEvent[];
}

interface EsqlResponse {
  columns: Array<{ name: string }>;
  values: unknown[][];
}

/** Whether the agent started after the last user message, i.e. the decision let it run. */
const agentRanAfterLastMessage = ({ events }: Conversation): boolean => {
  const lastUserMessage = events.map(({ type }) => type).lastIndexOf('user_message');

  return events.slice(lastUserMessage + 1).some(({ type }) => type === 'execution_started');
};

const toRow = ({ columns, values }: EsqlResponse): Record<string, unknown> | undefined => {
  const [row] = values;

  return row && Object.fromEntries(columns.map(({ name }, index) => [name, row[index]]));
};

/**
 * Drives `trigger_mode: 'auto'` end to end: shared conversations between two real users, a real
 * agent reply where the history needs one, and the decision read back from the traces.
 */
export class AutoTriggerClient {
  private readonly clients = new Map<AutoTriggerParticipant, KbnClient>();
  private previousInferenceSettings: unknown;

  constructor(
    private readonly deps: {
      kbnClient: KbnClient;
      esClient: EsClient;
      traceEsClient: EsClient;
      log: ToolingLog;
      kibanaUrl: string;
      /** The model under test, made Agent Builder's fast model. */
      connectorId: string;
      /** The model the agent answers with, kept fixed so only the decision varies. */
      agentConnectorId: string;
    }
  ) {}

  /** Creates the users and agents, and makes the connector under test Agent Builder's fast model. */
  async setUp(): Promise<void> {
    const { kbnClient, esClient, log, kibanaUrl, connectorId } = this.deps;

    for (const [participant, { username, fullName }] of Object.entries(PARTICIPANTS)) {
      const password = randomBytes(16).toString('hex');

      await esClient.security.putUser({
        username,
        password,
        full_name: fullName,
        roles: ['superuser'],
      });

      const url = new URL(kibanaUrl);
      url.username = username;
      url.password = password;

      this.clients.set(
        participant as AutoTriggerParticipant,
        new KbnClient({ log, url: url.href })
      );
    }

    for (const { id, name, description } of Object.values(AGENTS)) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/agent_builder/agents/${id}`,
        headers: { 'elastic-api-version': PUBLIC_API_VERSION },
        ignoreErrors: [404],
      });
      await kbnClient.request({
        method: 'POST',
        path: '/api/agent_builder/agents',
        headers: { 'elastic-api-version': PUBLIC_API_VERSION },
        body: {
          id,
          name,
          description,
          access_control: { access_mode: 'public' },
          configuration: { instructions: 'Answer in one or two sentences.', tools: [] },
        },
      });
    }

    const { data } = await kbnClient.request<{ data: unknown }>({
      method: 'GET',
      path: '/internal/search_inference_endpoints/settings',
      headers: { 'elastic-api-version': '1' },
    });

    this.previousInferenceSettings = data.data;

    await this.putInferenceSettings({
      features: [{ feature_id: FAST_MODEL_FEATURE_ID, endpoints: [{ id: connectorId }] }],
    });
  }

  async tearDown(): Promise<void> {
    const { kbnClient, esClient } = this.deps;

    if (this.previousInferenceSettings) {
      await this.putInferenceSettings(this.previousInferenceSettings);
    }

    for (const { id } of Object.values(AGENTS)) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/agent_builder/agents/${id}`,
        headers: { 'elastic-api-version': PUBLIC_API_VERSION },
        ignoreErrors: [404],
      });
    }

    for (const { username } of Object.values(PARTICIPANTS)) {
      await esClient.security.deleteUser({ username }, { ignore: [404] });
    }
  }

  /**
   * Replays the history in a new shared conversation, then sends the message with `'auto'`.
   * A failed attempt, e.g. a model error while the agent answers, retries in a new conversation.
   */
  run = (params: AutoTriggerRunParams): Promise<AutoTriggerResult> =>
    pRetry(() => this.runOnce(params), {
      retries: 2,
      minTimeout: 5000,
      onFailedAttempt: ({ attemptNumber, message: errorMessage }) =>
        this.deps.log.warning(`Auto trigger case attempt ${attemptNumber} failed: ${errorMessage}`),
    });

  private async runOnce({
    agent,
    history,
    author,
    message,
  }: AutoTriggerRunParams): Promise<AutoTriggerResult> {
    const { data: created } = await this.client('bruno').request<Conversation>({
      method: 'POST',
      path: '/api/agent_builder/conversations',
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      body: { agent_id: AGENTS[agent].id, access_control: { access_mode: 'public' } },
    });

    for (const { author: historyAuthor, text, runAgent } of history) {
      await this.converse(historyAuthor, {
        conversationId: created.id,
        input: text,
        triggerMode: runAgent ? 'always' : 'never',
      });
    }

    const startedAt = Date.now();
    const conversation = await this.converse(author, {
      conversationId: created.id,
      input: message,
      triggerMode: 'auto',
    });
    const requestMs = Date.now() - startedAt;

    return {
      conversationId: created.id,
      ran: agentRanAfterLastMessage(conversation),
      requestMs,
      decision: await this.findDecision(created.id),
    };
  }

  private client(participant: AutoTriggerParticipant): KbnClient {
    const client = this.clients.get(participant);

    if (!client) {
      throw new Error(`No Kibana client for [${participant}]; call setUp() first`);
    }

    return client;
  }

  private async converse(
    participant: AutoTriggerParticipant,
    {
      conversationId,
      input,
      triggerMode,
    }: { conversationId: string; input: string; triggerMode: 'always' | 'never' | 'auto' }
  ): Promise<Conversation> {
    const { data } = await this.client(participant).request<Conversation>({
      method: 'POST',
      path: '/api/chat/converse',
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      body: {
        conversation_id: conversationId,
        input,
        trigger_mode: triggerMode,
        connector_id: this.deps.agentConnectorId,
      },
      // A retried converse would find the first one still running and fail with a 409.
      retries: 0,
    });

    return data;
  }

  private async putInferenceSettings(settings: unknown): Promise<void> {
    await this.deps.kbnClient.request({
      method: 'PUT',
      path: '/internal/search_inference_endpoints/settings',
      headers: { 'elastic-api-version': '1' },
      body: settings,
    });
  }

  /**
   * Reads the conversation's `auto_trigger` span, and the `decide` span under it. Spans are
   * exported in batches, so this retries until they are indexed; undefined when tracing is off.
   */
  private async findDecision(conversationId: string): Promise<AutoTriggerDecision | undefined> {
    const { traceEsClient, log } = this.deps;
    const conversationIds = [conversationId, toHashedId(conversationId)]
      .map((id) => `"${id}"`)
      .join(', ');

    const query = async (esql: string) =>
      toRow((await traceEsClient.esql.query({ query: esql })) as unknown as EsqlResponse);

    try {
      return await pRetry(
        async () => {
          const autoTrigger = await query(`FROM traces-*
| WHERE name == "auto_trigger" AND attributes.gen_ai.conversation.id IN (${conversationIds})
| SORT @timestamp DESC
| LIMIT 1
| KEEP trace.id, duration, attributes.elastic.auto_trigger.*`);

          if (!autoTrigger) {
            throw new Error(`No auto_trigger span yet for conversation [${conversationId}]`);
          }

          const decide = await query(`FROM traces-*
| WHERE trace.id == "${autoTrigger['trace.id']}" AND name == "decide"
| LIMIT 1
| KEEP attributes.elastic.decision.*`);

          const attribute = (row: Record<string, unknown> | undefined, name: string) =>
            row?.[`attributes.elastic.${name}`] ?? undefined;

          return {
            status: String(attribute(autoTrigger, 'auto_trigger.status')),
            run: Boolean(attribute(autoTrigger, 'auto_trigger.run')),
            probability: attribute(autoTrigger, 'auto_trigger.probability') as number | undefined,
            threshold: attribute(autoTrigger, 'auto_trigger.threshold') as number | undefined,
            inferenceId: attribute(autoTrigger, 'auto_trigger.inference_id') as string | undefined,
            provider: attribute(decide, 'decision.provider') as string | undefined,
            durationMs: Number(autoTrigger.duration) / 1_000_000,
          };
        },
        { retries: 10, minTimeout: 2000, factor: 1 }
      );
    } catch (error) {
      log.warning(`No decision span for conversation [${conversationId}]: ${error.message}`);
      return undefined;
    }
  }
}
