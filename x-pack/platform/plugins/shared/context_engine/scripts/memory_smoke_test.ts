/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import { run } from '@kbn/dev-cli-runner';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from './seed_ki_sample_data/lib/connection_config';
import { getConnectionConfig } from './seed_ki_sample_data/lib/connection_config';
import { kibanaRequest } from './seed_ki_sample_data/lib/kibana';

const AGENT_BUILDER_API = '/api/agent_builder';
const AI_INDEX_API = '/api/context_engine/ai_index';
const CONVERSE_TIMEOUT_MS = 300_000;

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
      return candidate;
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
  input: string
): Promise<ConverseResult> => {
  const response = await kibanaRequest(
    config,
    'POST',
    `${AGENT_BUILDER_API}/converse`,
    {
      agent_id: agentId,
      input,
      _execution_mode: 'local',
    },
    { timeoutMs: CONVERSE_TIMEOUT_MS }
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

  return { conversationId, connectorId, message };
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
    const keepResources = flags['keep-resources'] === true;
    const conversationIds: string[] = [];
    let aiIndexCreated = false;
    let agentCreated = false;
    let memorySettingChanged = false;
    let previousMemoryEnabled: boolean | undefined;
    let primaryError: unknown;
    let successMessage: string | undefined;
    const cleanupErrors: string[] = [];

    log.info(`Using Kibana at ${config.kibanaUrl} as ${config.username}.`);

    try {
      const globalSettingsResponse = await kibanaRequest(
        config,
        'GET',
        '/internal/kibana/global_settings'
      );
      requireStatus('Read global settings', globalSettingsResponse, [200]);
      const globalSettings = asRecord(asRecord(globalSettingsResponse.data)?.settings);
      const memorySetting = asRecord(globalSettings?.[CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]);
      const userValue = memorySetting?.userValue;
      previousMemoryEnabled = typeof userValue === 'boolean' ? userValue : undefined;

      if (previousMemoryEnabled !== true) {
        const enableMemoryResponse = await kibanaRequest(
          config,
          'POST',
          '/internal/kibana/global_settings',
          { changes: { [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: true } }
        );
        requireStatus('Enable Memory for the smoke test', enableMemoryResponse, [200]);
        memorySettingChanged = true;
      }

      const aiIndexResponse = await kibanaRequest(config, 'POST', AI_INDEX_API, {
        id: aiIndexId,
        description: 'Temporary AI index for the live Memory smoke test.',
        dest: { type: 'index', value: destinationIndex },
        memory_enabled: true,
        automations: [],
        sources: [],
        traces: [],
      });
      requireStatus('Create temporary AI index', aiIndexResponse, [201]);
      aiIndexCreated = true;

      const agentResponse = await kibanaRequest(config, 'POST', `${AGENT_BUILDER_API}/agents`, {
        id: agentId,
        name: 'Memory smoke test agent',
        description: 'Disposable agent for testing cross-conversation Memory.',
        configuration: {
          instructions:
            'When explicitly asked to remember a durable shared fact, store it in the attached memory-enabled AI index. For later factual questions, inspect and search the attached AI index before answering.',
          tools: [],
          enable_elastic_capabilities: false,
          ai_indices: [aiIndexId],
        },
      });
      requireStatus('Create temporary agent', agentResponse, [200]);
      agentCreated = true;

      log.info('Asking the real model to store a unique fact…');
      const remember = await converse(
        config,
        agentId,
        `${projectLabel} uses deployment code ${secretToken}. This is a granular durable shared project fact that will be needed in future conversations. Store it in the attached memory, then confirm only after storage succeeds.`
      );
      conversationIds.push(remember.conversationId);
      log.info(`Memory write completed through connector "${remember.connectorId}".`);

      log.info('Starting a new conversation and asking the real model to recall it…');
      const recallPrompt = `What deployment code does ${projectLabel} use? Inspect and search the attached memory before answering. Return the code exactly.`;
      if (recallPrompt.includes(secretToken)) {
        throw new Error('Recall prompt unexpectedly contains the secret token.');
      }

      const recall = await converse(config, agentId, recallPrompt);
      conversationIds.push(recall.conversationId);

      if (recall.conversationId === remember.conversationId) {
        throw new Error('Recall reused the write conversation instead of creating a new one.');
      }
      if (!recall.message.toLowerCase().includes(secretToken.toLowerCase())) {
        throw new Error(
          `Fresh-conversation recall did not return "${secretToken}". Agent answered: ${recall.message}`
        );
      }

      successMessage = `Memory smoke test passed: "${secretToken}" was recalled in a new conversation through connector "${recall.connectorId}".`;
    } catch (error) {
      primaryError = error;
    } finally {
      if (keepResources) {
        log.warning(
          `Keeping temporary resources: agent=${agentId}, aiIndex=${aiIndexId}, conversations=${conversationIds.join(
            ','
          )}`
        );
      } else {
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

        if (agentCreated) {
          try {
            const response = await kibanaRequest(
              config,
              'DELETE',
              `${AGENT_BUILDER_API}/agents/${encodeURIComponent(agentId)}`
            );
            if (!requestSucceeded(response.status) && response.status !== 404) {
              cleanupErrors.push(
                `agent ${agentId}: ${formatResponse(response.status, response.data)}`
              );
            }
          } catch (error) {
            cleanupErrors.push(
              `agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        if (aiIndexCreated) {
          try {
            const response = await kibanaRequest(
              config,
              'DELETE',
              `${AI_INDEX_API}/${encodeURIComponent(aiIndexId)}?delete_knowledge_indicators=true`
            );
            if (!requestSucceeded(response.status) && response.status !== 404) {
              cleanupErrors.push(
                `AI index ${aiIndexId}: ${formatResponse(response.status, response.data)}`
              );
            }
          } catch (error) {
            cleanupErrors.push(
              `AI index ${aiIndexId}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        if (memorySettingChanged) {
          try {
            const path =
              previousMemoryEnabled === undefined
                ? `/internal/kibana/global_settings/${encodeURIComponent(
                    CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID
                  )}`
                : '/internal/kibana/global_settings';
            const response = await kibanaRequest(
              config,
              previousMemoryEnabled === undefined ? 'DELETE' : 'POST',
              path,
              previousMemoryEnabled === undefined
                ? undefined
                : {
                    changes: {
                      [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: previousMemoryEnabled,
                    },
                  }
            );
            if (!requestSucceeded(response.status)) {
              cleanupErrors.push(
                `global Memory setting: ${formatResponse(response.status, response.data)}`
              );
            }
          } catch (error) {
            cleanupErrors.push(
              `global Memory setting: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
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
    description:
      'Smoke-test cross-conversation Context Engine Memory using the real Agent Builder model.',
    flags: {
      string: ['kibana-url', 'username', 'password'],
      boolean: ['keep-resources'],
      help: `
        Prerequisites:
          1. Start local serverless Elasticsearch with EIS configured.
          2. Run node scripts/eis.js.
          3. Start Kibana with Context Engine, Memory, and Agent Builder enabled.

        Options:
          --kibana-url <url>   Kibana base URL (default: from kibana.dev.yml)
          --username <user>    Kibana username (default: auto-detect local dev user)
          --password <pass>    Kibana password (default: changeme)
          --keep-resources     Do not delete temporary resources after the run

        Usage:
          node scripts/memory_smoke_test.js
      `,
    },
  }
);
