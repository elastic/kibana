/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import type { SandboxApiClient } from './grpc_client';
import type { SandboxCallContext } from './tool_utils';
import { writeConnectorManifest } from './connector_manifest';

const CONVERSATION_ID = 'conversation-1';

/**
 * Values that must never reach the manifest. They are attached to the raw connector
 * saved objects handed to `actionsClient.getAll`.
 */
const SECRETS = {
  apiKey: 'sk-live-9f2c-super-secret-api-key',
  token: 'ghp_topsecrettokenvalue',
  password: 'hunter2-not-in-markdown',
  webhookUrl: 'https://hooks.example.com/services/T000/B000/SECRETPATH',
  clientSecret: 'client-secret-do-not-leak',
} as const;

const createRawConnector = (overrides: Record<string, unknown> = {}) => ({
  id: 'connector-1',
  name: 'My GitHub',
  actionTypeId: '.github',
  isPreconfigured: false,
  isDeprecated: false,
  config: {
    apiUrl: 'https://api.github.com',
    apiKey: SECRETS.apiKey,
    clientSecret: SECRETS.clientSecret,
    webhookUrl: SECRETS.webhookUrl,
  },
  secrets: {
    token: SECRETS.token,
    password: SECRETS.password,
  },
  apiKey: SECRETS.apiKey,
  ...overrides,
});

const createApiClientMock = () => ({
  writeFiles: jest.fn().mockResolvedValue([{ path: '/workspace/connectors.md', success: true }]),
});

const createCallContext = (allowedConnectorIds: readonly string[]): SandboxCallContext => ({
  request: httpServerMock.createKibanaRequest(),
  allowedConnectorIds,
});

const createGetActionsClient = (connectors: Array<Record<string, unknown>>) => {
  const getAll = jest.fn().mockResolvedValue(connectors);
  const getActionsClient = jest.fn(async (_req: KibanaRequest) => ({ getAll }));
  return { getActionsClient, getAll };
};

const renderManifest = async ({
  allowedConnectorIds = ['connector-1'],
  connectors = [createRawConnector()],
  withActionsClient = true,
}: {
  allowedConnectorIds?: readonly string[];
  connectors?: Array<Record<string, unknown>>;
  withActionsClient?: boolean;
} = {}) => {
  const apiClient = createApiClientMock();
  const { getActionsClient } = createGetActionsClient(connectors);
  const logger = loggingSystemMock.createLogger();

  await writeConnectorManifest({
    conversationId: CONVERSATION_ID,
    apiClient: apiClient as unknown as SandboxApiClient,
    callContext: createCallContext(allowedConnectorIds),
    getActionsClient: withActionsClient ? (getActionsClient as any) : undefined,
    logger,
  });

  const [conversationId, files] = apiClient.writeFiles.mock.calls[0];
  return {
    apiClient,
    logger,
    conversationId: conversationId as string,
    files: files as Array<{ path: string; content: Buffer }>,
    content: (files as Array<{ path: string; content: Buffer }>)[0].content.toString('utf8'),
  };
};

describe('writeConnectorManifest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('file writing', () => {
    it('writes the manifest to /workspace/connectors.md for the conversation', async () => {
      const { conversationId, files } = await renderManifest();

      expect(conversationId).toBe(CONVERSATION_ID);
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('/workspace/connectors.md');
      expect(files[0].content).toBeInstanceOf(Buffer);
    });

    it('documents the per-command credential injection contract', async () => {
      const { content } = await renderManifest();

      expect(content).toContain('# Sandbox Connectors');
      expect(content).toContain('`connector_id` parameter of the bash tool');
      expect(content).toContain('CONNECTOR_CONFIG_<KEY>');
      expect(content).toContain('CONNECTOR_SECRET_<KEY>');
      expect(content).toContain('env | grep ^CONNECTOR_ | cut -d= -f1');
    });

    it('does not advertise an in-sandbox connector callback CLI', async () => {
      const { content } = await renderManifest();

      expect(content).not.toContain('sandbox-cb');
      expect(content).not.toContain('--sub-action');
      expect(content).not.toContain('## elasticsearch');
    });
  });

  describe('connector listing', () => {
    it('renders the connector heading with its id and type', async () => {
      const { content } = await renderManifest();

      expect(content).toContain('## My GitHub (connector-id: connector-1, type: .github)');
    });

    it('renders every allow-listed connector', async () => {
      const { content } = await renderManifest({
        allowedConnectorIds: ['connector-1', 'connector-2'],
        connectors: [
          createRawConnector(),
          createRawConnector({ id: 'connector-2', name: 'Second GitHub' }),
        ],
      });

      expect(content).toContain('## My GitHub (connector-id: connector-1');
      expect(content).toContain('## Second GitHub (connector-id: connector-2');
    });

    it('notes when the allow-list is empty', async () => {
      const { content } = await renderManifest({ allowedConnectorIds: [], connectors: [] });

      expect(content).toContain('*(No connectors are assigned to this agent.)*');
    });

    it('notes when the actions client is unavailable', async () => {
      const { content } = await renderManifest({ withActionsClient: false });

      expect(content).toContain('*(No connectors are assigned to this agent.)*');
    });
  });

  describe('secret redaction', () => {
    it('never renders secret-bearing fields or values', async () => {
      const { content } = await renderManifest({
        connectors: [createRawConnector({ extraSensitiveField: 'another-secret-value' })],
      });

      for (const [field, value] of Object.entries(SECRETS)) {
        expect(content).not.toContain(value);
        expect(content).not.toContain(field);
      }
      expect(content).not.toContain('another-secret-value');
      expect(content).not.toContain('extraSensitiveField');
      expect(content).not.toContain('https://api.github.com');
    });
  });
});
