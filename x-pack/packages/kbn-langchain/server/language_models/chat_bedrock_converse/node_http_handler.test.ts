/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeHttpHandler } from './node_http_handler';
import { HttpRequest } from '@smithy/protocol-http';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { Readable } from 'stream';
import { fromUtf8 } from '@smithy/util-utf8';

const mockActionsClient = actionsClientMock.create();
const connectorId = 'mock-connector-id';
const mockOutput = {
  output: {
    message: {
      role: 'assistant',
      content: [{ text: 'This is a response from the assistant.' }],
    },
  },
  stopReason: 'end_turn',
  usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  metrics: { latencyMs: 123 },
  additionalModelResponseFields: {},
  trace: { guardrail: { modelOutput: ['Output text'] } },
};
describe('NodeHttpHandler', () => {
  let handler: NodeHttpHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new NodeHttpHandler({
      streaming: false,
      actionsClient: mockActionsClient,
      connectorId,
    });

    mockActionsClient.execute.mockResolvedValue({
      data: mockOutput,
      actionId: 'mock-action-id',
      status: 'ok',
    });
  });

  it('handles non-streaming requests successfully', async () => {
    const request = new HttpRequest({
      body: JSON.stringify({ messages: [] }),
    });

    const result = await handler.handle(request);

    expect(result.response.statusCode).toBe(200);
    expect(result.response.headers['content-type']).toBe('application/json');
    expect(result.response.body).toStrictEqual(fromUtf8(JSON.stringify(mockOutput)));
  });

  it('handles streaming requests successfully', async () => {
    handler = new NodeHttpHandler({
      streaming: true,
      actionsClient: mockActionsClient,
      connectorId,
    });

    const request = new HttpRequest({
      body: JSON.stringify({ messages: [] }),
    });

    const readable = new Readable();
    readable.push('streaming data');
    readable.push(null);

    mockActionsClient.execute.mockResolvedValue({
      data: readable,
      status: 'ok',
      actionId: 'mock-action-id',
    });

    const result = await handler.handle(request);

    expect(result.response.statusCode).toBe(200);
    expect(result.response.body).toBe(readable);
  });

  it('throws an error for non-streaming requests with error status', async () => {
    const request = new HttpRequest({
      body: JSON.stringify({ messages: [] }),
    });

    mockActionsClient.execute.mockResolvedValue({
      status: 'error',
      message: 'error message',
      serviceMessage: 'service error message',
      actionId: 'mock-action-id',
    });

    await expect(handler.handle(request)).rejects.toThrow(
      'ActionsClientBedrockChat: action result status is error: error message - service error message'
    );
  });

  it('throws an error for streaming requests with error status', async () => {
    handler = new NodeHttpHandler({
      streaming: true,
      actionsClient: mockActionsClient,
      connectorId,
    });

    const request = new HttpRequest({
      body: JSON.stringify({ messages: [] }),
    });

    mockActionsClient.execute.mockResolvedValue({
      status: 'error',
      message: 'error message',
      serviceMessage: 'service error message',
      actionId: 'mock-action-id',
    });

    await expect(handler.handle(request)).rejects.toThrow(
      'ActionsClientBedrockChat: action result status is error: error message - service error message'
    );
  });
});
