/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 } from 'uuid';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { ToolingLog } from '@kbn/tooling-log';
import { createConnectorFixture } from './create_connector_fixture';

describe('createConnectorFixture', () => {
  let mockFetch: jest.Mock;
  let mockLog: jest.Mocked<ToolingLog>;
  let mockUse: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP;
    mockFetch = jest.fn().mockResolvedValue(undefined);
    mockLog = {
      info: jest.fn(),
      debug: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as any;
    mockUse = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP;
  });

  describe('delegation to createStackConnectorFixture', () => {
    it('delegates non-.inference connectors to the stack connector path', async () => {
      const emailConnector: AvailableConnectorWithId = {
        id: 'my-email',
        name: 'Email',
        actionTypeId: '.email',
        config: { from: 'test@example.com' },
        secrets: {},
      };
      const uuid = v5(emailConnector.id, v5.DNS);

      mockFetch.mockResolvedValueOnce({ is_preconfigured: false }).mockResolvedValueOnce(undefined);

      await createConnectorFixture({
        predefinedConnector: emailConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch.mock.calls.some(([a]: [any]) => a.path?.startsWith('/api/actions'))).toBe(
        true
      );
      expect(mockUse).toHaveBeenCalledWith({ ...emailConnector, id: uuid });
    });

    it('delegates .inference connectors without inferenceId to the stack connector path', async () => {
      const inferenceWithoutEndpoint: AvailableConnectorWithId = {
        id: 'local-inference',
        name: 'Local Inference',
        actionTypeId: '.inference',
        config: { provider: 'openai', taskType: 'chat_completion' },
        secrets: {},
      };
      const uuid = v5(inferenceWithoutEndpoint.id, v5.DNS);

      mockFetch.mockResolvedValueOnce({ is_preconfigured: false }).mockResolvedValueOnce(undefined);

      await createConnectorFixture({
        predefinedConnector: inferenceWithoutEndpoint,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).toHaveBeenNthCalledWith(2, {
        path: `/api/actions/connector/${uuid}`,
        method: 'POST',
        body: JSON.stringify({
          config: inferenceWithoutEndpoint.config,
          connector_type_id: inferenceWithoutEndpoint.actionTypeId,
          name: inferenceWithoutEndpoint.name,
          secrets: inferenceWithoutEndpoint.secrets,
        }),
      });
      expect(mockUse).toHaveBeenCalledWith({ ...inferenceWithoutEndpoint, id: uuid });
    });
  });

  describe('with an EIS connector (.inference with config.inferenceId)', () => {
    const eisConnector: AvailableConnectorWithId = {
      id: 'eis-gpt-4o',
      name: 'EIS GPT-4o',
      actionTypeId: '.inference',
      config: {
        provider: 'elastic',
        inferenceId: '.openai-gpt-4o-chat_completion',
        taskType: 'chat_completion',
      },
      secrets: {},
    };

    it('binds to the inference endpoint without creating a stack connector', async () => {
      mockFetch.mockResolvedValueOnce({ isEndpointExists: true });

      await createConnectorFixture({
        predefinedConnector: eisConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith({
        path: `/internal/_inference/_exists/${encodeURIComponent(
          '.openai-gpt-4o-chat_completion'
        )}`,
        method: 'GET',
        headers: { 'elastic-api-version': '1' },
      });

      // No Actions API calls at all
      const actionsCalls = mockFetch.mock.calls.filter(([arg]: [{ path: string }]) =>
        arg.path.startsWith('/api/actions')
      );
      expect(actionsCalls).toHaveLength(0);

      expect(mockUse).toHaveBeenCalledWith({
        ...eisConnector,
        id: '.openai-gpt-4o-chat_completion',
      });
    });

    it('URI-encodes the inference endpoint id in the exists path', async () => {
      mockFetch.mockResolvedValueOnce({ isEndpointExists: true });

      await createConnectorFixture({
        predefinedConnector: eisConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      const [{ path }] = mockFetch.mock.calls[0];
      expect(path).toBe('/internal/_inference/_exists/.openai-gpt-4o-chat_completion');
    });

    it('throws a clear error when the endpoint does not exist, without falling back to Actions', async () => {
      mockFetch.mockResolvedValueOnce({ isEndpointExists: false });

      await expect(
        createConnectorFixture({
          predefinedConnector: eisConnector,
          fetch: mockFetch,
          log: mockLog,
          use: mockUse,
        })
      ).rejects.toThrow(
        /Inference endpoint \[\.openai-gpt-4o-chat_completion\] for EIS connector \[eis-gpt-4o\] is not available/
      );

      const actionsCalls = mockFetch.mock.calls.filter(([arg]: [{ path: string }]) =>
        arg.path.startsWith('/api/actions')
      );
      expect(actionsCalls).toHaveLength(0);
      expect(mockUse).not.toHaveBeenCalled();
    });

    it('throws a clear error when the exists check fails, without falling back to Actions', async () => {
      const serverError = Object.assign(new Error('Internal Server Error'), { status: 500 });
      mockFetch.mockRejectedValueOnce(serverError);

      await expect(
        createConnectorFixture({
          predefinedConnector: eisConnector,
          fetch: mockFetch,
          log: mockLog,
          use: mockUse,
        })
      ).rejects.toThrow(/is not available.*Internal Server Error/s);

      const actionsCalls = mockFetch.mock.calls.filter(([arg]: [{ path: string }]) =>
        arg.path.startsWith('/api/actions')
      );
      expect(actionsCalls).toHaveLength(0);
      expect(mockUse).not.toHaveBeenCalled();
    });

    it('is bypassed by KBN_EVALS_SKIP_CONNECTOR_SETUP (yields the connector as-is)', async () => {
      process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP = 'true';

      await createConnectorFixture({
        predefinedConnector: eisConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockUse).toHaveBeenCalledWith(eisConnector);
    });
  });

  describe('with an endpoint-shaped .inference connector (OpenRouter from the CI generator)', () => {
    const openRouterEndpointConnector: AvailableConnectorWithId = {
      id: 'openrouter-anthropic-claude-sonnet-4-6',
      name: 'OpenRouter anthropic/claude-sonnet-4.6',
      actionTypeId: '.inference',
      config: {
        provider: 'openai',
        taskType: 'chat_completion',
        inferenceId: 'openrouter-anthropic-claude-sonnet-4-6',
        providerConfig: {
          model_id: 'anthropic/claude-sonnet-4.6',
          url: 'https://openrouter.ai/api/v1/chat/completions',
        },
      },
      secrets: {
        providerSecrets: { api_key: 'openrouter-key' },
      },
    };

    const expectedAddCall = {
      path: '/internal/_inference/_add',
      method: 'POST',
      headers: { 'elastic-api-version': '1' },
      body: JSON.stringify({
        config: openRouterEndpointConnector.config,
        secrets: openRouterEndpointConnector.secrets,
      }),
    };

    const expectNoActionsCalls = () => {
      const actionsCalls = mockFetch.mock.calls.filter(([arg]: [{ path: string }]) =>
        arg.path.startsWith('/api/actions')
      );
      expect(actionsCalls).toHaveLength(0);
    };

    it('binds to the existing inference endpoint without creating anything', async () => {
      mockFetch.mockResolvedValueOnce({ isEndpointExists: true });

      await createConnectorFixture({
        predefinedConnector: openRouterEndpointConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith({
        path: `/internal/_inference/_exists/${encodeURIComponent(openRouterEndpointConnector.id)}`,
        method: 'GET',
        headers: { 'elastic-api-version': '1' },
      });

      expectNoActionsCalls();
      expect(mockUse).toHaveBeenCalledWith({
        ...openRouterEndpointConnector,
        id: openRouterEndpointConnector.id,
      });
    });

    it('creates the inference endpoint from the definition when missing, then binds to it', async () => {
      mockFetch.mockResolvedValueOnce({ isEndpointExists: false }).mockResolvedValueOnce(undefined);

      await createConnectorFixture({
        predefinedConnector: openRouterEndpointConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(2, expectedAddCall);

      expectNoActionsCalls();
      expect(mockUse).toHaveBeenCalledWith({
        ...openRouterEndpointConnector,
        id: openRouterEndpointConnector.id,
      });
    });

    it('treats an already-exists error on create as success (parallel workers)', async () => {
      const existsError = Object.assign(new Error('Bad Request'), {
        status: 400,
        response: {
          data: {
            statusCode: 400,
            error: 'Bad Request',
            message: `Inference endpoint [${openRouterEndpointConnector.id}] already exists`,
          },
        },
      });

      mockFetch
        .mockResolvedValueOnce({ isEndpointExists: false })
        .mockRejectedValueOnce(existsError);

      await createConnectorFixture({
        predefinedConnector: openRouterEndpointConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expectNoActionsCalls();
      expect(mockUse).toHaveBeenCalledWith({
        ...openRouterEndpointConnector,
        id: openRouterEndpointConnector.id,
      });
    });

    it('throws other errors on create and does not bind', async () => {
      const serverError = Object.assign(new Error('Internal Server Error'), { status: 500 });

      mockFetch
        .mockResolvedValueOnce({ isEndpointExists: false })
        .mockRejectedValueOnce(serverError);

      await expect(
        createConnectorFixture({
          predefinedConnector: openRouterEndpointConnector,
          fetch: mockFetch,
          log: mockLog,
          use: mockUse,
        })
      ).rejects.toThrow('Internal Server Error');

      expectNoActionsCalls();
      expect(mockUse).not.toHaveBeenCalled();
    });

    it('is bypassed by KBN_EVALS_SKIP_CONNECTOR_SETUP (yields the connector as-is)', async () => {
      process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP = 'true';

      await createConnectorFixture({
        predefinedConnector: openRouterEndpointConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockUse).toHaveBeenCalledWith(openRouterEndpointConnector);
    });
  });

  describe('when KBN_EVALS_SKIP_CONNECTOR_SETUP is set', () => {
    const predefinedConnector: AvailableConnectorWithId = {
      id: 'my-test-connector',
      name: 'Test Connector',
      actionTypeId: '.email',
      config: { from: 'test@example.com' },
      secrets: { user: 'user', password: 'pass' },
    };

    beforeEach(() => {
      process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP = 'true';
    });

    it('skips setup/teardown and calls use() with the predefined connector as-is', async () => {
      await createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockUse).toHaveBeenCalledWith(predefinedConnector);
    });

    it('logs a message indicating connector setup is being skipped', async () => {
      await createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('Skipping connector setup/teardown')
      );
      expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining(predefinedConnector.id));
    });
  });
});
