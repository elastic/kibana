/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Connector-level upstream error paths; pure helper coverage lives in helpers.test.ts.
import { Readable } from 'node:stream';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { TaskErrorSource, getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { InferenceConnector } from './inference';

describe('InferenceConnector upstream error propagation', () => {
  const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
  const services = actionsMock.createServices();
  services.scopedClusterClient = mockEsClient;
  const logger = loggingSystemMock.createLogger();
  const connector = new InferenceConnector({
    configurationUtilities: actionsConfigMock.create(),
    connector: { id: '1', type: '123' },
    config: {
      provider: 'openai',
      providerConfig: {
        url: 'http://sglang.internal:30000/v1/chat/completions',
        model_id: 'gpt-4o',
      },
      taskType: 'chat_completion',
      inferenceId: 'sglang-chat',
      taskTypeConfig: {},
    },
    secrets: { providerSecrets: { api_key: '123' } },
    logger,
    services,
  });
  const params = { body: { messages: [{ content: 'What is Elastic?', role: 'user' as const }] } };
  let connectorUsageCollector: ConnectorUsageCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
  });

  describe('performApiUnifiedCompletionStream', () => {
    it('includes the inference id, status code and upstream body for >= 400 responses', async () => {
      const upstreamBody =
        '{"error":{"message":"maximum context length is 8192 tokens. However, you requested 9000 tokens","type":"BadRequestError","code":400}}';
      (mockEsClient.transport.request as unknown as jest.Mock).mockResolvedValue({
        body: Readable.from([upstreamBody]),
        statusCode: 400,
      });

      const error = await connector.performApiUnifiedCompletionStream(params).catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('sglang-chat');
      expect(error.message).toContain('400');
      expect(error.message).toContain('maximum context length is 8192 tokens');
      expect(getErrorSource(error)).toBe(TaskErrorSource.USER);
    });

    it('caps the upstream body included in the error message', async () => {
      (mockEsClient.transport.request as unknown as jest.Mock).mockResolvedValue({
        body: Readable.from(['x'.repeat(5000)]),
        statusCode: 500,
      });

      const error = await connector.performApiUnifiedCompletionStream(params).catch((e) => e);

      expect(error.message).toContain('500');
      expect(error.message).toHaveLength(1000);
      expect(error.message).toContain('... [truncated]');
      expect(getErrorSource(error)).toBe(TaskErrorSource.FRAMEWORK);
    });
  });

  it.each([
    [401, TaskErrorSource.USER],
    [500, TaskErrorSource.FRAMEWORK],
  ])(
    'classifies status %i when the upstream body stream fails mid-read',
    async (statusCode, source) => {
      const body = new Readable({
        read() {
          this.push('partial body');
          this.destroy(new Error('connection reset'));
        },
      });
      (mockEsClient.transport.request as unknown as jest.Mock).mockResolvedValue({
        body,
        statusCode,
      });
      const error = await connector.performApiUnifiedCompletionStream(params).catch((e) => e);
      expect(error.message).toContain(`status code ${statusCode}`);
      expect(error.message).toContain('connection reset');
      expect(getErrorSource(error)).toBe(source);
    }
  );

  it('omits a dangling separator for an empty upstream body', async () => {
    (mockEsClient.transport.request as unknown as jest.Mock).mockResolvedValue({
      body: Readable.from([]),
      statusCode: 403,
    });
    const error = await connector.performApiUnifiedCompletionStream(params).catch((e) => e);
    expect(error.message).toContain('status code 403');
    expect(error.message).not.toMatch(/: $/);
    expect(getErrorSource(error)).toBe(TaskErrorSource.USER);
  });

  it('redacts upstream credentials from the connector error', async () => {
    (mockEsClient.transport.request as unknown as jest.Mock).mockResolvedValue({
      body: Readable.from([
        '{"error":"Bearer abc123 sk-live-abcdef123456 api_key: secret123 authorization: token123"}',
      ]),
      statusCode: 401,
    });
    const error = await connector.performApiUnifiedCompletionStream(params).catch((e) => e);
    expect(error.message).toContain('[redacted]');
    for (const secret of ['abc123', 'sk-live-abcdef123456', 'secret123', 'token123']) {
      expect(error.message).not.toContain(secret);
    }
  });

  it('bounds and redacts an in-band SSE error', async () => {
    const secret = 'sseCredential123';
    const message = `upstream rejected; token: ${secret}; context length exceeded ${'x'.repeat(
      2000
    )}`;
    (mockEsClient.transport.request as unknown as jest.Mock).mockResolvedValue({
      body: Readable.from([`data: ${JSON.stringify({ error: { message } })}\n\n`]),
      statusCode: 200,
    });

    const error = await connector.performApiUnifiedCompletion(params).catch((e) => e);

    expect(error.message).toContain('context length exceeded');
    expect(error.message).not.toContain(secret);
    expect(error.message).toHaveLength(1000);
    expect(error.message).toContain('... [truncated]');
  });

  describe('performApiUnifiedCompletionAsyncIterator', () => {
    it('propagates the upstream body for >= 400 responses', async () => {
      (mockEsClient.transport.request as unknown as jest.Mock).mockResolvedValue({
        body: Readable.from(['{"error":{"message":"context length exceeded"}}']),
        statusCode: 400,
      });

      const error = await connector
        .performApiUnifiedCompletionAsyncIterator(params, connectorUsageCollector)
        .catch((e) => e);

      expect(error.message).toContain('sglang-chat');
      expect(error.message).toContain('400');
      expect(error.message).toContain('context length exceeded');
    });

    it('includes the underlying message for transport errors, not "Method not implemented"', async () => {
      const transportError = Object.assign(new Error(''), {
        name: 'ResponseError',
        statusCode: 502,
        body: 'upstream boom',
      });
      (mockEsClient.transport.request as unknown as jest.Mock).mockRejectedValue(transportError);

      const error = await connector
        .performApiUnifiedCompletionAsyncIterator(params, connectorUsageCollector)
        .catch((e) => e);

      expect(error.message).toContain('upstream boom');
      expect(error.message).toContain('502');
      expect(error).toBe(transportError);
      expect(error.message).not.toContain('Method not implemented');
    });

    it('includes status code and body from ResponseError-shaped transport errors', async () => {
      const responseError = Object.assign(new Error('Response Error'), {
        name: 'ResponseError',
        statusCode: 502,
        body: { error: { reason: 'upstream connect error or disconnect/reset before headers' } },
      });
      (mockEsClient.transport.request as unknown as jest.Mock).mockRejectedValue(responseError);

      const error = await connector
        .performApiUnifiedCompletionAsyncIterator(params, connectorUsageCollector)
        .catch((e) => e);

      expect(error.message).toContain('Response Error');
      expect(error.message).toContain('502');
      expect(error.message).toContain('upstream connect error or disconnect/reset before headers');
    });

    it('keeps the enriched message when the caught error has a read-only message', async () => {
      const readOnly = Object.freeze(
        Object.assign(new Error('connection refused'), {
          response: { status: 502, data: 'upstream unavailable' },
        })
      );
      (mockEsClient.transport.request as unknown as jest.Mock).mockRejectedValue(readOnly);

      const error = await connector
        .performApiUnifiedCompletionAsyncIterator(params, connectorUsageCollector)
        .catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('connection refused');
      expect(error.message).toContain('upstream unavailable');
      expect(error).not.toBe(readOnly);
      expect(error.cause).toBe(readOnly);
    });

    it.each([
      [
        '{"error":{"message":"Received a rate limit status code from the inference service: status [429] and current quota]"}}',
        'Received a rate limit status code from the inference service: status [429] and current quota]',
        false,
      ],
      [
        `{"error":{"message":"status [429] quota ${'x'.repeat(2000)}"}}`,
        'status [429] quota',
        true,
      ],
    ])('still bubbles up user errors as-is for %s', async (upstreamBody, diagnostic, truncated) => {
      (mockEsClient.transport.request as unknown as jest.Mock).mockResolvedValue({
        body: Readable.from([upstreamBody]),
        statusCode: 400,
      });

      const error = await connector
        .performApiUnifiedCompletionAsyncIterator(params, connectorUsageCollector)
        .catch((e) => e);

      expect(getErrorSource(error)).toBe(TaskErrorSource.USER);
      expect(error.message).toContain(diagnostic);
      expect(error.message.includes('... [truncated]')).toBe(truncated);
      expect(error.message.length).toBeLessThanOrEqual(1000);
    });
  });
});
