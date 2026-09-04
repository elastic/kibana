/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 } from 'uuid';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { ToolingLog } from '@kbn/tooling-log';
import { KbnClientRequesterError } from '@kbn/kbn-client';
import {
  createConnectorFixture,
  getConnectorIdAsUuid,
  resolveConnectorId,
} from './create_connector_fixture';

describe('getConnectorIdAsUuid', () => {
  it('returns a valid UUID v5 for a given connector id', () => {
    const result = getConnectorIdAsUuid('my-connector');
    // UUID v5 format: 8-4-4-4-12 hex chars
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns the same UUID for the same input (deterministic)', () => {
    const first = getConnectorIdAsUuid('my-connector');
    const second = getConnectorIdAsUuid('my-connector');
    expect(first).toBe(second);
  });

  it('returns different UUIDs for different inputs', () => {
    const a = getConnectorIdAsUuid('connector-a');
    const b = getConnectorIdAsUuid('connector-b');
    expect(a).not.toBe(b);
  });
});

describe('resolveConnectorId', () => {
  afterEach(() => {
    delete process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP;
  });

  it('returns a UUID when KBN_EVALS_SKIP_CONNECTOR_SETUP is not set', () => {
    delete process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP;

    const result = resolveConnectorId('my-connector');
    expect(result).toBe(getConnectorIdAsUuid('my-connector'));
  });

  it('returns the original id when KBN_EVALS_SKIP_CONNECTOR_SETUP is set', () => {
    process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP = 'true';

    const result = resolveConnectorId('my-connector');
    expect(result).toBe('my-connector');
  });
});

describe('createConnectorFixture', () => {
  // Non-LLM connector (e.g. the mock email/Slack connectors used by evals_workflows):
  // these are the only connectors still created through the Actions API.
  const predefinedConnector: AvailableConnectorWithId = {
    id: 'my-test-connector',
    name: 'Test Connector',
    actionTypeId: '.email',
    config: { from: 'test@example.com' },
    secrets: { user: 'user', password: 'pass' },
  };

  const expectedUuid = v5(predefinedConnector.id, v5.DNS);

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

  it('creates the connector without deleting first', async () => {
    await createConnectorFixture({
      predefinedConnector,
      fetch: mockFetch,
      log: mockLog,
      use: mockUse,
    });

    // First call: GET (check if connector is preconfigured)
    expect(mockFetch).toHaveBeenNthCalledWith(1, {
      path: `/api/actions/connector/${predefinedConnector.id}`,
      method: 'GET',
    });

    // Second call: POST (create)
    expect(mockFetch).toHaveBeenNthCalledWith(2, {
      path: `/api/actions/connector/${expectedUuid}`,
      method: 'POST',
      body: JSON.stringify({
        config: predefinedConnector.config,
        connector_type_id: predefinedConnector.actionTypeId,
        name: predefinedConnector.name,
        secrets: predefinedConnector.secrets,
      }),
    });
  });

  it('generates a deterministic UUID for the connector id', async () => {
    await createConnectorFixture({
      predefinedConnector,
      fetch: mockFetch,
      log: mockLog,
      use: mockUse,
    });

    // The POST path uses the UUID-ified id
    const postCall = mockFetch.mock.calls.find(
      ([arg]: [{ method: string }]) => arg.method === 'POST'
    );
    expect(postCall).toBeDefined();
    expect(postCall![0].path).toBe(`/api/actions/connector/${expectedUuid}`);
  });

  it('calls use() with the UUID-ified connector', async () => {
    await createConnectorFixture({
      predefinedConnector,
      fetch: mockFetch,
      log: mockLog,
      use: mockUse,
    });

    expect(mockUse).toHaveBeenCalledWith({
      ...predefinedConnector,
      id: expectedUuid,
    });
  });

  it('does not delete the connector on teardown (shared across parallel workers)', async () => {
    const callOrder: string[] = [];

    mockFetch.mockImplementation(async ({ method }: { method: string }) => {
      callOrder.push(method);
    });

    mockUse.mockImplementation(async () => {
      callOrder.push('use');
    });

    await createConnectorFixture({
      predefinedConnector,
      fetch: mockFetch,
      log: mockLog,
      use: mockUse,
    });

    // Order: GET (preconfigured check), POST (create), use() — no teardown DELETE
    expect(callOrder).toEqual(['GET', 'POST', 'use']);
  });

  it('handles 409 conflict on create when another worker already created the connector', async () => {
    const conflictError = Object.assign(new Error('Conflict'), { status: 409 });

    // First call (preconfigured check) returns not preconfigured, second call (POST) returns 409
    mockFetch
      .mockResolvedValueOnce({ is_preconfigured: false })
      .mockRejectedValueOnce(conflictError);

    await expect(
      createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      })
    ).resolves.toBeUndefined();

    // Should still proceed to use()
    expect(mockUse).toHaveBeenCalledWith({
      ...predefinedConnector,
      id: expectedUuid,
    });
  });

  it('handles 400 when inference endpoint already exists (parallel workers)', async () => {
    const existsError = Object.assign(new Error('Bad Request'), {
      status: 400,
      response: {
        data: {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Inference endpoint [dev-my-test-connector] already exists',
        },
      },
    });

    mockFetch.mockResolvedValueOnce({ is_preconfigured: false }).mockRejectedValueOnce(existsError);

    await expect(
      createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      })
    ).resolves.toBeUndefined();

    expect(mockUse).toHaveBeenCalledWith({
      ...predefinedConnector,
      id: expectedUuid,
    });
  });

  it('throws non-conflict errors on create', async () => {
    const serverError = Object.assign(new Error('Internal Server Error'), { status: 500 });

    // First call (preconfigured check) succeeds, second call (POST) fails hard
    mockFetch.mockResolvedValueOnce({ is_preconfigured: false }).mockRejectedValueOnce(serverError);

    await expect(
      createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      })
    ).rejects.toThrow('Internal Server Error');

    // Should not proceed to use()
    expect(mockUse).not.toHaveBeenCalled();
  });

  it('throws 400 when message is not an already-exists case', async () => {
    const badRequest = Object.assign(new Error('Bad Request'), {
      status: 400,
      response: { data: { message: 'Invalid API key' } },
    });

    mockFetch.mockResolvedValueOnce({ is_preconfigured: false }).mockRejectedValueOnce(badRequest);

    await expect(
      createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      })
    ).rejects.toThrow();

    expect(mockUse).not.toHaveBeenCalled();
  });

  it('reuses a preconfigured connector and skips create/delete', async () => {
    mockFetch.mockResolvedValueOnce({ is_preconfigured: true });

    await createConnectorFixture({
      predefinedConnector,
      fetch: mockFetch,
      log: mockLog,
      use: mockUse,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith({
      path: `/api/actions/connector/${predefinedConnector.id}`,
      method: 'GET',
    });
    expect(mockUse).toHaveBeenCalledWith(predefinedConnector);
  });

  describe('with KbnClientRequesterError (production error shape)', () => {
    // KbnClient stringifies the response body into the error message after ` -- `, mirroring what
    // `KbnClientRequester` does in production. Tests must use this exact shape to cover the real
    // failure path that surfaces from `httpHandlerFromKbnClient`.
    const buildKbnClientError = (status: number, body: unknown) =>
      new KbnClientRequesterError(
        `[POST http://localhost:5620/api/actions/connector/${expectedUuid}] ${status} -- ${JSON.stringify(
          body
        )}`,
        { status }
      );

    it('handles 409 conflict on create (race between parallel workers)', async () => {
      const conflictError = buildKbnClientError(409, {
        statusCode: 409,
        error: 'Conflict',
        message: `A connector is already using this ID: ${expectedUuid}. Choose a different ID.`,
      });

      mockFetch
        .mockResolvedValueOnce({ is_preconfigured: false })
        .mockRejectedValueOnce(conflictError);

      await expect(
        createConnectorFixture({
          predefinedConnector,
          fetch: mockFetch,
          log: mockLog,
          use: mockUse,
        })
      ).resolves.toBeUndefined();

      expect(mockUse).toHaveBeenCalledWith({
        ...predefinedConnector,
        id: expectedUuid,
      });
    });

    it('handles 400 when inference endpoint already exists', async () => {
      const existsError = buildKbnClientError(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Inference endpoint [dev-my-test-connector] already exists',
      });

      mockFetch
        .mockResolvedValueOnce({ is_preconfigured: false })
        .mockRejectedValueOnce(existsError);

      await expect(
        createConnectorFixture({
          predefinedConnector,
          fetch: mockFetch,
          log: mockLog,
          use: mockUse,
        })
      ).resolves.toBeUndefined();

      expect(mockUse).toHaveBeenCalledWith({
        ...predefinedConnector,
        id: expectedUuid,
      });
    });

    it('throws non-conflict errors on create', async () => {
      const serverError = buildKbnClientError(500, {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Something broke',
      });

      mockFetch
        .mockResolvedValueOnce({ is_preconfigured: false })
        .mockRejectedValueOnce(serverError);

      await expect(
        createConnectorFixture({
          predefinedConnector,
          fetch: mockFetch,
          log: mockLog,
          use: mockUse,
        })
      ).rejects.toBeInstanceOf(KbnClientRequesterError);

      expect(mockUse).not.toHaveBeenCalled();
    });

    it('throws 400 when message is not an already-exists case', async () => {
      const badRequest = buildKbnClientError(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid API key',
      });

      mockFetch
        .mockResolvedValueOnce({ is_preconfigured: false })
        .mockRejectedValueOnce(badRequest);

      await expect(
        createConnectorFixture({
          predefinedConnector,
          fetch: mockFetch,
          log: mockLog,
          use: mockUse,
        })
      ).rejects.toBeInstanceOf(KbnClientRequesterError);

      expect(mockUse).not.toHaveBeenCalled();
    });

    it('treats 404 on the preconfigured check as "not preconfigured" and creates the connector', async () => {
      const notFound = new KbnClientRequesterError(
        `[GET http://localhost:5620/api/actions/connector/${predefinedConnector.id}] 404 Not Found -- {}`,
        { status: 404 }
      );

      mockFetch.mockRejectedValueOnce(notFound).mockResolvedValueOnce(undefined);

      await createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).toHaveBeenNthCalledWith(2, {
        path: `/api/actions/connector/${expectedUuid}`,
        method: 'POST',
        body: JSON.stringify({
          config: predefinedConnector.config,
          connector_type_id: predefinedConnector.actionTypeId,
          name: predefinedConnector.name,
          secrets: predefinedConnector.secrets,
        }),
      });
      expect(mockUse).toHaveBeenCalledWith({
        ...predefinedConnector,
        id: expectedUuid,
      });
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

    it('falls back to the stack connector path for .inference connectors without an inferenceId', async () => {
      const inferenceWithoutEndpoint: AvailableConnectorWithId = {
        ...eisConnector,
        id: 'local-inference',
        config: { provider: 'openai', taskType: 'chat_completion' },
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

  describe('with a .gen-ai connector (OpenRouter)', () => {
    const openRouterConnector: AvailableConnectorWithId = {
      id: 'openrouter-anthropic-claude-sonnet-4-6',
      name: 'OpenRouter anthropic/claude-sonnet-4.6',
      actionTypeId: '.gen-ai',
      config: {
        apiProvider: 'Other',
        apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
        enableNativeFunctionCalling: true,
        defaultModel: 'anthropic/claude-sonnet-4.6',
      },
      secrets: { apiKey: 'openrouter-key' },
    };

    const expectedAddCall = {
      path: '/internal/_inference/_add',
      method: 'POST',
      headers: { 'elastic-api-version': '1' },
      body: JSON.stringify({
        config: {
          inferenceId: openRouterConnector.id,
          provider: 'openai',
          taskType: 'chat_completion',
          providerConfig: {
            model_id: 'anthropic/claude-sonnet-4.6',
            url: 'https://openrouter.ai/api/v1/chat/completions',
          },
        },
        secrets: {
          providerSecrets: { api_key: 'openrouter-key' },
        },
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
        predefinedConnector: openRouterConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith({
        path: `/internal/_inference/_exists/${encodeURIComponent(openRouterConnector.id)}`,
        method: 'GET',
        headers: { 'elastic-api-version': '1' },
      });

      expectNoActionsCalls();
      expect(mockUse).toHaveBeenCalledWith({
        ...openRouterConnector,
        id: openRouterConnector.id,
      });
    });

    it('creates a chat_completion inference endpoint when missing, then binds to it', async () => {
      mockFetch.mockResolvedValueOnce({ isEndpointExists: false }).mockResolvedValueOnce(undefined);

      await createConnectorFixture({
        predefinedConnector: openRouterConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(2, expectedAddCall);

      expectNoActionsCalls();
      expect(mockUse).toHaveBeenCalledWith({
        ...openRouterConnector,
        id: openRouterConnector.id,
      });
    });

    it('treats an already-exists error on create as success (parallel workers)', async () => {
      const existsError = Object.assign(new Error('Bad Request'), {
        status: 400,
        response: {
          data: {
            statusCode: 400,
            error: 'Bad Request',
            message: `Inference endpoint [${openRouterConnector.id}] already exists`,
          },
        },
      });

      mockFetch
        .mockResolvedValueOnce({ isEndpointExists: false })
        .mockRejectedValueOnce(existsError);

      await createConnectorFixture({
        predefinedConnector: openRouterConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expectNoActionsCalls();
      expect(mockUse).toHaveBeenCalledWith({
        ...openRouterConnector,
        id: openRouterConnector.id,
      });
    });

    it('treats an already-exists KbnClientRequesterError on create as success', async () => {
      const existsError = new KbnClientRequesterError(
        `[POST http://localhost:5620/internal/_inference/_add] 400 -- ${JSON.stringify({
          statusCode: 400,
          error: 'Bad Request',
          message: `Inference endpoint [${openRouterConnector.id}] already exists`,
        })}`,
        { status: 400 }
      );

      mockFetch
        .mockResolvedValueOnce({ isEndpointExists: false })
        .mockRejectedValueOnce(existsError);

      await createConnectorFixture({
        predefinedConnector: openRouterConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expectNoActionsCalls();
      expect(mockUse).toHaveBeenCalledWith({
        ...openRouterConnector,
        id: openRouterConnector.id,
      });
    });

    it('throws other errors on create and does not bind', async () => {
      const serverError = Object.assign(new Error('Internal Server Error'), { status: 500 });

      mockFetch
        .mockResolvedValueOnce({ isEndpointExists: false })
        .mockRejectedValueOnce(serverError);

      await expect(
        createConnectorFixture({
          predefinedConnector: openRouterConnector,
          fetch: mockFetch,
          log: mockLog,
          use: mockUse,
        })
      ).rejects.toThrow('Internal Server Error');

      expectNoActionsCalls();
      expect(mockUse).not.toHaveBeenCalled();
    });

    it('throws a clear error for .gen-ai connectors without apiUrl/defaultModel', async () => {
      const invalidConnector: AvailableConnectorWithId = {
        ...openRouterConnector,
        id: 'gen-ai-without-model',
        config: { apiProvider: 'OpenAI' },
      };

      await expect(
        createConnectorFixture({
          predefinedConnector: invalidConnector,
          fetch: mockFetch,
          log: mockLog,
          use: mockUse,
        })
      ).rejects.toThrow(/without config\.apiUrl\/config\.defaultModel/);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockUse).not.toHaveBeenCalled();
    });

    it('is bypassed by KBN_EVALS_SKIP_CONNECTOR_SETUP (yields the connector as-is)', async () => {
      process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP = 'true';

      await createConnectorFixture({
        predefinedConnector: openRouterConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockUse).toHaveBeenCalledWith(openRouterConnector);
    });
  });

  describe('when KBN_EVALS_SKIP_CONNECTOR_SETUP is set', () => {
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
