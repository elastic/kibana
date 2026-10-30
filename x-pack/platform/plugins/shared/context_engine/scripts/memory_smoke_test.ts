/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { randomBytes, randomUUID } from 'crypto';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from './seed_ki_sample_data/lib/connection_config';
import { getConnectionConfig } from './seed_ki_sample_data/lib/connection_config';
import { kibanaRequest } from './seed_ki_sample_data/lib/kibana';

const AGENT_BUILDER_API = '/api/agent_builder';
const AI_INDEX_API = '/api/context_engine/ai_index';
const CONVERSE_TIMEOUT_MS = 16 * 60 * 1000;

interface ConverseResult {
  conversationId: string;
  connectorId: string;
  message: string;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const getString = (value: Record<string, unknown> | undefined, key: string): string | undefined => {
  const field = value?.[key];
  return typeof field === 'string' ? field : undefined;
};

const formatResponse = (status: number, data: unknown): string =>
  `HTTP ${status}: ${JSON.stringify(data)}`;

const requestSucceeded = (status: number): boolean => status >= 200 && status < 300;

const createEsClient = (config: ConnectionConfig): Client =>
  new Client({
    node: config.esUrl,
    auth: { username: config.username, password: config.password },
    ...(config.esUrl.startsWith('https://') ? { tls: { rejectUnauthorized: false } } : {}),
  });

const resolveElasticsearchUrl = async (
  config: ConnectionConfig,
  explicitUrl: boolean,
  log: ToolingLog
): Promise<ConnectionConfig> => {
  const alternateUrl = config.esUrl.startsWith('http://')
    ? config.esUrl.replace('http://', 'https://')
    : config.esUrl.replace('https://', 'http://');
  const urls = explicitUrl ? [config.esUrl] : [config.esUrl, alternateUrl];

  for (const esUrl of urls) {
    const candidate = { ...config, esUrl };
    const client = createEsClient(candidate);
    try {
      if (await client.ping()) {
        return candidate;
      }
    } catch (error) {
      log.debug(
        `Elasticsearch probe at ${esUrl} failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      await client.close();
    }
  }

  throw new Error(
    `Could not connect to Elasticsearch at ${urls.join(' or ')}. Use --es-url to override it.`
  );
};

const resolveAuthenticatedConfig = async (
  flags: Record<string, unknown>,
  log: ToolingLog
): Promise<ConnectionConfig> => {
  const baseConfig = await getConnectionConfig(flags, log);
  const explicitUsername = flags.username ? String(flags.username) : undefined;
  const password = flags.password ? String(flags.password) : baseConfig.password;
  const usernames = explicitUsername
    ? [explicitUsername]
    : [baseConfig.username, 'elastic_serverless'].filter(
        (username, index, values) => values.indexOf(username) === index
      );

  for (const username of usernames) {
    const candidate = { ...baseConfig, username, password };
    const response = await kibanaRequest(candidate, 'GET', AI_INDEX_API);
    if (response.status === 200) {
      return resolveElasticsearchUrl(candidate, Boolean(flags['es-url']), log);
    }
    log.debug(
      `Context Engine preflight as "${username}" returned ${formatResponse(
        response.status,
        response.data
      )}.`
    );
  }

  throw new Error(
    `Could not access Context Engine at ${baseConfig.kibanaUrl} as ${usernames.join(
      ' or '
    )}. Check that Kibana is running with Context Engine enabled, or use --username and --password to override local credentials.`
  );
};

const requireStatus = (
  operation: string,
  response: { status: number; data: unknown },
  expectedStatuses: readonly number[]
): void => {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${operation} failed (${formatResponse(response.status, response.data)})`);
  }
};

const converse = async (
  config: ConnectionConfig,
  agentId: string,
  expectedConversationId: string,
  input: string,
  signal: AbortSignal
): Promise<ConverseResult> => {
  const response = await kibanaRequest(
    config,
    'POST',
    `${AGENT_BUILDER_API}/converse`,
    {
      agent_id: agentId,
      conversation_id: expectedConversationId,
      input,
      _execution_mode: 'local',
    },
    { timeoutMs: CONVERSE_TIMEOUT_MS, signal }
  );
  requireStatus('Agent conversation', response, [200]);

  const body = asRecord(response.data);
  const responseBody = asRecord(body?.response);
  const modelUsage = asRecord(body?.model_usage);
  const conversationId = getString(body, 'conversation_id');
  const connectorId = getString(modelUsage, 'connector_id');
  const message = getString(responseBody, 'message');

  if (!conversationId || !connectorId || message === undefined) {
    throw new Error(
      `Agent conversation returned an incomplete response: ${JSON.stringify(response.data)}`
    );
  }
  if (conversationId !== expectedConversationId) {
    throw new Error(
      `Agent conversation returned "${conversationId}" instead of "${expectedConversationId}".`
    );
  }

  return { conversationId, connectorId, message };
};

const getEisInferenceIds = async (client: Client, signal: AbortSignal): Promise<Set<string>> => {
  const response = await client.inference.get({ inference_id: '_all' }, { signal });
  const endpoints = response.endpoints as Array<{
    inference_id: string;
    service: string;
    task_type: string;
  }>;
  return new Set(
    endpoints
      .filter(({ service, task_type: taskType }) => {
        return service === 'elastic' && taskType === 'chat_completion';
      })
      .map(({ inference_id: inferenceId }) => inferenceId)
  );
};

run(
  async ({ log, flags }) => {
    const config = await resolveAuthenticatedConfig(flags, log);
    const runId = randomBytes(6).toString('hex');
    const aiIndexId = `memory-smoke-${runId}`;
    const destinationIndex = `ai-index-idx-${aiIndexId}`;
    const agentId = `memory-smoke-${runId}`;
    const projectLabel = `project-${randomBytes(4).toString('hex')}`;
    const secretToken = `cobalt-${randomBytes(6).toString('hex')}`;
    const conversationIds = [randomUUID(), randomUUID()];
    const abortController = new AbortController();
    const esClient = createEsClient(config);
    let primaryError: unknown;
    let successMessage: string | undefined;
    let interruptedSignal: 'SIGINT' | 'SIGTERM' | undefined;
    const cleanupErrors: string[] = [];
    const interrupt = (signal: 'SIGINT' | 'SIGTERM') => {
      interruptedSignal = signal;
      log.warning(`Received ${signal}; cancelling the active request and cleaning up…`);
      abortController.abort(new Error(`Interrupted by ${signal}`));
    };
    const onSigint = () => interrupt('SIGINT');
    const onSigterm = () => interrupt('SIGTERM');
    process.once('SIGINT', onSigint);
    process.once('SIGTERM', onSigterm);

    log.info(`Using Kibana at ${config.kibanaUrl} as ${config.username}.`);

    try {
      const eisInferenceIds = await getEisInferenceIds(esClient, abortController.signal);
      if (eisInferenceIds.size === 0) {
        throw new Error(
          'No EIS chat-completion endpoints are available. Start Elasticsearch with EIS configured and run node scripts/eis.js.'
        );
      }

      abortController.signal.throwIfAborted();
      const aiIndexResponse = await kibanaRequest(
        config,
        'POST',
        AI_INDEX_API,
        {
          id: aiIndexId,
          description: 'Temporary AI index for the live Memory smoke test.',
          dest: { type: 'index', value: destinationIndex },
          memory_enabled: true,
          automations: [],
          sources: [],
          traces: [],
        },
        { signal: abortController.signal }
      );
      if (
        aiIndexResponse.status === 400 &&
        JSON.stringify(aiIndexResponse.data).includes('memory is disabled')
      ) {
        throw new Error(
          'Context Engine Memory is disabled. Start Kibana with --uiSettings.overrides.contextEngine:memoryEnabled=true.'
        );
      }
      requireStatus('Create temporary AI index', aiIndexResponse, [201]);

      abortController.signal.throwIfAborted();
      const agentResponse = await kibanaRequest(
        config,
        'POST',
        `${AGENT_BUILDER_API}/agents`,
        {
          id: agentId,
          name: 'Memory smoke test agent',
          description: 'Disposable agent for testing cross-conversation Memory.',
          configuration: {
            tools: [],
            enable_elastic_capabilities: false,
            ai_indices: [aiIndexId],
          },
        },
        { signal: abortController.signal }
      );
      requireStatus('Create temporary agent', agentResponse, [200]);

      log.info('Asking the real model to store a unique fact…');
      const remember = await converse(
        config,
        agentId,
        conversationIds[0],
        `Remember this for later: ${projectLabel}'s deployment code is ${secretToken}.`,
        abortController.signal
      );
      if (!eisInferenceIds.has(remember.connectorId)) {
        throw new Error(
          `Agent Builder selected "${remember.connectorId}", which is not an EIS chat-completion endpoint.`
        );
      }
      log.info(`Memory write completed through connector "${remember.connectorId}".`);

      log.info('Starting a new conversation and asking the real model to recall it…');
      const recallPrompt = `What is ${projectLabel}'s deployment code?`;
      if (recallPrompt.includes(secretToken)) {
        throw new Error('Recall prompt unexpectedly contains the secret token.');
      }

      const recall = await converse(
        config,
        agentId,
        conversationIds[1],
        recallPrompt,
        abortController.signal
      );

      if (recall.conversationId === remember.conversationId) {
        throw new Error('Recall reused the write conversation instead of creating a new one.');
      }
      if (!eisInferenceIds.has(recall.connectorId)) {
        throw new Error(
          `Agent Builder selected "${recall.connectorId}", which is not an EIS chat-completion endpoint.`
        );
      }
      if (!recall.message.toLowerCase().includes(secretToken.toLowerCase())) {
        throw new Error(
          `Fresh-conversation recall did not return "${secretToken}". Agent answered: ${recall.message}`
        );
      }

      successMessage = `Memory smoke test passed: "${secretToken}" was recalled in a new conversation through connector "${recall.connectorId}".`;
    } catch (error) {
      primaryError = interruptedSignal
        ? new Error(`Memory smoke test interrupted by ${interruptedSignal}.`)
        : error;
    } finally {
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);

      for (const conversationId of conversationIds) {
        try {
          const response = await kibanaRequest(
            config,
            'DELETE',
            `${AGENT_BUILDER_API}/conversations/${encodeURIComponent(conversationId)}`
          );
          if (!requestSucceeded(response.status) && response.status !== 404) {
            cleanupErrors.push(
              `conversation ${conversationId}: ${formatResponse(response.status, response.data)}`
            );
          }
        } catch (error) {
          cleanupErrors.push(
            `conversation ${conversationId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      try {
        const response = await kibanaRequest(
          config,
          'DELETE',
          `${AGENT_BUILDER_API}/agents/${encodeURIComponent(agentId)}`
        );
        if (!requestSucceeded(response.status) && response.status !== 404) {
          cleanupErrors.push(`agent ${agentId}: ${formatResponse(response.status, response.data)}`);
        }
      } catch (error) {
        cleanupErrors.push(
          `agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      try {
        const response = await kibanaRequest(
          config,
          'DELETE',
          `${AI_INDEX_API}/${encodeURIComponent(aiIndexId)}?delete_knowledge_indicators=true`
        );
        if (response.status === 200) {
          const body = asRecord(response.data);
          const acknowledged = body?.acknowledged;
          const errors = Array.isArray(body?.errors)
            ? body.errors.filter((error): error is string => typeof error === 'string')
            : [];
          if (acknowledged !== true || errors.length > 0) {
            cleanupErrors.push(
              `AI index ${aiIndexId}: ${JSON.stringify({ acknowledged, errors })}`
            );
          }
        } else if (response.status !== 404) {
          cleanupErrors.push(
            `AI index ${aiIndexId}: ${formatResponse(response.status, response.data)}`
          );
        }
      } catch (error) {
        cleanupErrors.push(
          `AI index ${aiIndexId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      try {
        await esClient.indices.delete({ index: destinationIndex }, { ignore: [404] });
      } catch (error) {
        cleanupErrors.push(
          `backing index ${destinationIndex}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      try {
        await esClient.close();
      } catch (error) {
        cleanupErrors.push(
          `Elasticsearch client: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (primaryError !== undefined) {
      if (cleanupErrors.length > 0) {
        log.error(`Cleanup failed:\n${cleanupErrors.join('\n')}`);
      }
      throw primaryError;
    }
    if (cleanupErrors.length > 0) {
      throw new Error(`Cleanup failed:\n${cleanupErrors.join('\n')}`);
    }
    if (successMessage === undefined) {
      throw new Error('Memory smoke test ended without a result.');
    }
    log.success(successMessage);
  },
  {
    description: 'Smoke-test cross-conversation Context Engine Memory using a real EIS model.',
    flags: {
      string: ['kibana-url', 'es-url', 'username', 'password'],
      help: `
        Prerequisites:
          1. Start local serverless Elasticsearch with EIS configured.
          2. Run node scripts/eis.js.
          3. Start Kibana with Context Engine, Memory, and Agent Builder enabled.

        Options:
          --kibana-url <url>   Kibana base URL (default: from kibana.dev.yml)
          --es-url <url>       Elasticsearch URL (default: auto-detect local URL)
          --username <user>    Kibana username (default: auto-detect local dev user)
          --password <pass>    Kibana password (default: changeme)

        Usage:
          node scripts/memory_smoke_test.js
      `,
    },
  }
);
