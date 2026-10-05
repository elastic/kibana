/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { TaskErrorSource, getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { InferenceConnector } from './inference';
import { buildInferenceErrorMessage, truncateUpstreamBody } from './helpers';

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
      // @ts-ignore
      mockEsClient.transport.request.mockResolvedValue({
        body: Readable.from([upstreamBody]),
        statusCode: 400,
      });

      const error = await connector.performApiUnifiedCompletionStream(params).catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('sglang-chat');
      expect(error.message).toContain('400');
      expect(error.message).toContain('maximum context length is 8192 tokens');
    });

    it('caps the upstream body included in the error message', async () => {
      // @ts-ignore
      mockEsClient.transport.request.mockResolvedValue({
        body: Readable.from(['x'.repeat(5000)]),
        statusCode: 500,
      });

      const error = await connector.performApiUnifiedCompletionStream(params).catch((e) => e);

      expect(error.message).toContain('500');
      expect(error.message).toContain('x'.repeat(1000));
      expect(error.message).not.toContain('x'.repeat(1001));
    });
  });

  describe('performApiUnifiedCompletionAsyncIterator', () => {
    it('propagates the upstream body for >= 400 responses', async () => {
      // @ts-ignore
      mockEsClient.transport.request.mockResolvedValue({
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
      const transportError = Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:30000'), {
        name: 'ConnectionError',
      });
      // @ts-ignore
      mockEsClient.transport.request.mockRejectedValue(transportError);

      const error = await connector
        .performApiUnifiedCompletionAsyncIterator(params, connectorUsageCollector)
        .catch((e) => e);

      expect(error.message).toContain('connect ECONNREFUSED 10.0.0.5:30000');
      expect(error.message).not.toContain('Method not implemented');
    });

    it('includes status code and body from ResponseError-shaped transport errors', async () => {
      const responseError = Object.assign(new Error('Response Error'), {
        name: 'ResponseError',
        statusCode: 502,
        body: { error: { reason: 'upstream connect error or disconnect/reset before headers' } },
      });
      // @ts-ignore
      mockEsClient.transport.request.mockRejectedValue(responseError);

      const error = await connector
        .performApiUnifiedCompletionAsyncIterator(params, connectorUsageCollector)
        .catch((e) => e);

      expect(error.message).toContain('Response Error');
      expect(error.message).toContain('502');
      expect(error.message).toContain('upstream connect error or disconnect/reset before headers');
    });

    it('still bubbles up user errors as-is', async () => {
      // @ts-ignore
      mockEsClient.transport.request.mockResolvedValue({
        body: Readable.from([
          '{"error":{"message":"Received a rate limit status code for request from inference entity id [x] status [429]. Error message: [You exceeded your current quota]"}}',
        ]),
        statusCode: 400,
      });

      const error = await connector
        .performApiUnifiedCompletionAsyncIterator(params, connectorUsageCollector)
        .catch((e) => e);

      expect(getErrorSource(error)).toBe(TaskErrorSource.USER);
    });
  });
});

describe('truncateUpstreamBody', () => {
  it('returns short strings as-is and stringifies objects', () => {
    expect(truncateUpstreamBody('short')).toBe('short');
    expect(truncateUpstreamBody({ a: 1 })).toBe('{"a":1}');
    expect(truncateUpstreamBody(undefined)).toBe('');
  });

  it('caps long bodies at 1000 chars', () => {
    const result = truncateUpstreamBody('y'.repeat(3000));
    expect(result).toContain('y'.repeat(1000));
    expect(result).not.toContain('y'.repeat(1001));
  });

  it('does not throw on circular structures', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => truncateUpstreamBody(circular)).not.toThrow();
  });
});

describe('buildInferenceErrorMessage', () => {
  it('handles AxiosError-shaped errors', () => {
    const message = buildInferenceErrorMessage({
      message: 'Request failed with status code 400',
      response: { status: 400, data: { error: 'context length exceeded' } },
    });
    expect(message).toContain('Request failed with status code 400');
    expect(message).toContain('context length exceeded');
  });

  it('handles ES ResponseError-shaped errors', () => {
    const message = buildInferenceErrorMessage({
      message: 'Response Error',
      statusCode: 503,
      body: 'model overloaded',
    });
    expect(message).toContain('Response Error');
    expect(message).toContain('Status code: 503');
    expect(message).toContain('model overloaded');
  });

  it('handles plain errors, strings and nullish values without throwing', () => {
    expect(buildInferenceErrorMessage(new Error('boom'))).toBe('boom');
    expect(buildInferenceErrorMessage('plain')).toBe('plain');
    expect(buildInferenceErrorMessage(undefined)).toBe('Unknown error');
    expect(buildInferenceErrorMessage({})).toBe('Unknown error');
  });
});
