/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { getConnectorSpec } from '@kbn/connector-specs';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import type { SandboxApiClient } from './grpc_client';
import type { SandboxCallContext } from './tool_utils';
import { writeConnectorManifest } from './connector_manifest';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
  // Mirrors the real (one-line) implementation so specs stay declared inline in the tests.
  isToolAction: (spec: { actions?: Record<string, { isTool?: boolean }> }, actionName: string) =>
    spec.actions?.[actionName]?.isTool ?? false,
}));

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;

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
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
});

const createGetActionsClient = (connectors: Array<Record<string, unknown>>) => {
  const getAll = jest.fn().mockResolvedValue(connectors);
  const getActionsClient = jest.fn(async (_req: KibanaRequest) => ({ getAll }));
  return { getActionsClient, getAll };
};

const toolAction = (overrides: Record<string, unknown> = {}) => ({
  isTool: true,
  scope: 'read' as const,
  handler: jest.fn(),
  input: z.object({}),
  ...overrides,
});

const createSpec = (actions: Record<string, unknown>): ConnectorSpec =>
  ({
    metadata: {
      id: '.github',
      displayName: 'GitHub',
      description: 'GitHub connector',
      minimumLicense: 'platinum',
      supportedFeatureIds: [],
    },
    actions,
    test: { handler: jest.fn(), enabled: false },
  } as unknown as ConnectorSpec);

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
    getActionsClient: withActionsClient ? getActionsClient : undefined,
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
    getConnectorSpecMock.mockReturnValue(undefined);
  });

  describe('file writing', () => {
    it('writes the manifest to /workspace/connectors.md for the conversation', async () => {
      const { conversationId, files } = await renderManifest();

      expect(conversationId).toBe(CONVERSATION_ID);
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('/workspace/connectors.md');
      expect(files[0].content).toBeInstanceOf(Buffer);
    });

    it('documents the sandbox-cb invocation contract', async () => {
      const { content } = await renderManifest();

      expect(content).toContain('# Sandbox Connectors');
      expect(content).toContain('sandbox-cb --connector-id <id> --sub-action <name>');
    });
  });

  describe('synthetic elasticsearch connector', () => {
    it('renders the elasticsearch section first, before any third-party connector', async () => {
      const { content } = await renderManifest();

      const headings = content.match(/^## .*$/gm) ?? [];
      expect(headings[0]).toContain('elasticsearch');
      expect(content.indexOf('## elasticsearch')).toBeLessThan(content.indexOf('## My GitHub'));
    });

    it('documents all three read-only sub-actions', async () => {
      const { content } = await renderManifest();

      expect(content).toContain('### esql');
      expect(content).toContain('### resolve_index');
      expect(content).toContain('### get_mapping');
      expect(content).toContain('Elasticsearch RBAC applies.');
    });

    it('still lists elasticsearch when the allow-list is empty', async () => {
      const { content } = await renderManifest({ allowedConnectorIds: [], connectors: [] });

      expect(content).toContain('## elasticsearch (synthetic — always available)');
      expect(content).toContain('*(No third-party connectors are assigned to this agent.)*');
    });

    it('still lists elasticsearch when the actions client is unavailable', async () => {
      const { content } = await renderManifest({ withActionsClient: false });

      expect(content).toContain('## elasticsearch (synthetic — always available)');
      expect(content).toContain('*(No third-party connectors are assigned to this agent.)*');
    });
  });

  describe('spec-driven connectors', () => {
    beforeEach(() => {
      getConnectorSpecMock.mockReturnValue(
        createSpec({
          search_issues: toolAction({
            description: 'Search issues in a repository.',
            scope: 'read',
            input: z.object({
              query: z.string().describe('The search query'),
              repo: z.string().optional().describe('Repository to search'),
            }),
          }),
          create_issue: toolAction({
            description: 'Create a new issue.',
            scope: 'write',
            input: z.object({ title: z.string().describe('Issue title') }),
          }),
          internal_refresh_token: toolAction({ isTool: false, description: 'Internal only.' }),
        })
      );
    });

    it('renders the connector heading with its id and type', async () => {
      const { content } = await renderManifest();

      expect(content).toContain('## My GitHub (connector-id: connector-1, type: .github)');
    });

    it('renders each tool sub-action with its description, scope and param schema', async () => {
      const { content } = await renderManifest();

      expect(content).toContain('### search_issues');
      expect(content).toContain('Search issues in a repository.');
      expect(content).toContain('Scope: read');
      expect(content).toContain('Params schema:');
      expect(content).toContain('- query (string, required): The search query');
      expect(content).toContain('- repo (string, optional): Repository to search');

      expect(content).toContain('### create_issue');
      expect(content).toContain('Scope: write');
      expect(content).toContain('- title (string, required): Issue title');
    });

    it('omits sub-actions that are not tool actions', async () => {
      const { content } = await renderManifest();

      expect(content).not.toContain('internal_refresh_token');
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

    it('notes when a spec exposes no tool sub-actions', async () => {
      getConnectorSpecMock.mockReturnValue(createSpec({}));

      const { content } = await renderManifest();

      expect(content).toContain('*No tool sub-actions available for this connector type.*');
    });

    it('renders "No parameters" rather than failing for an action without a usable schema', async () => {
      getConnectorSpecMock.mockReturnValue(
        createSpec({
          ping: { isTool: true, scope: 'read', handler: jest.fn(), description: 'Ping.' },
        })
      );

      const { content } = await renderManifest();

      expect(content).toContain('### ping');
      expect(content).toContain('Params schema: No parameters');
    });
  });

  describe('legacy connectors without a spec', () => {
    it('renders the "not documented" note', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);

      const { content } = await renderManifest({
        connectors: [createRawConnector({ actionTypeId: '.server-log', name: 'Server log' })],
      });

      expect(content).toContain('## Server log (connector-id: connector-1, type: .server-log)');
      expect(content).toContain(
        '*Sub-actions are not documented for this connector type. Probe with a test call to discover available sub-actions.*'
      );
    });
  });

  describe('secret redaction', () => {
    const expectNoSecrets = (content: string) => {
      for (const [field, value] of Object.entries(SECRETS)) {
        expect(content).not.toContain(value);
        expect(content).not.toContain(field);
      }
      expect(content).not.toContain('secrets');
      expect(content).not.toContain('config');
    };

    it('never renders secret-bearing fields for a spec-less connector', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);

      const { content } = await renderManifest();

      expectNoSecrets(content);
    });

    it('never renders secret-bearing fields for a spec-driven connector', async () => {
      getConnectorSpecMock.mockReturnValue(
        createSpec({
          search_issues: toolAction({
            description: 'Search issues.',
            input: z.object({ query: z.string().describe('The search query') }),
          }),
        })
      );

      const { content } = await renderManifest();

      expectNoSecrets(content);
    });

    it('only ever renders the connector id, name and type', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);

      const { content } = await renderManifest({
        connectors: [
          createRawConnector({
            name: 'Redacted Connector',
            actionTypeId: '.github',
            extraSensitiveField: 'another-secret-value',
          }),
        ],
      });

      expect(content).toContain('## Redacted Connector (connector-id: connector-1, type: .github)');
      expect(content).not.toContain('another-secret-value');
      expect(content).not.toContain('extraSensitiveField');
    });
  });
});
