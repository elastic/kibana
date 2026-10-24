/**
 * @jest-environment node
 */

/* eslint-disable @kbn/eslint/require-license-header */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { CONNECTOR_ID, OpenAiProviderType } from '@kbn/connector-schemas/openai';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { OpenAIConnector } from './openai';

const logger = loggingSystemMock.createLogger();

const completion = {
  id: 'chatcmpl-1',
  object: 'chat.completion',
  created: 1,
  model: 'qwen3',
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
};

const chunk = {
  id: 'chatcmpl-1',
  object: 'chat.completion.chunk',
  created: 1,
  model: 'qwen3',
  choices: [{ index: 0, delta: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
};

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const part of req) {
    chunks.push(Buffer.isBuffer(part) ? part : Buffer.from(part));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const drain = async (stream: NodeJS.ReadableStream) => {
  for await (const _ of stream) {
    // consume
  }
};

describe('OpenAI connector extraBody on the wire', () => {
  let server: Server;
  let apiUrl: string;
  let received: Array<Record<string, unknown>>;

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      const body = JSON.parse(await readBody(req));
      received.push(body);
      if (body.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.end(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`);
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(completion));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/chat/completions`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    received = [];
  });

  const createConnector = (extraBody?: Record<string, unknown>) =>
    new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: CONNECTOR_ID },
      config: {
        apiUrl,
        apiProvider: OpenAiProviderType.Other,
        defaultModel: 'qwen3',
        ...(extraBody ? { extraBody } : {}),
      },
      secrets: { apiKey: 'test-key' },
      logger,
      services: actionsMock.createServices(),
    });

  const usageCollector = () =>
    new ConnectorUsageCollector({ logger, connectorId: 'test-connector-id' });

  const extraBody = {
    chat_template_kwargs: { enable_thinking: false },
    top_k: 20,
    temperature: 0.7,
  };
  const messages = [{ role: 'user', content: 'Hello' }];

  it('invokeAI sends extraBody fields to the model server', async () => {
    await createConnector(extraBody).invokeAI({ messages, temperature: 0 }, usageCollector());

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      chat_template_kwargs: { enable_thinking: false },
      top_k: 20,
      // the request's own value wins over extraBody
      temperature: 0,
      messages,
      model: 'qwen3',
      stream: false,
    });
  });

  it('invokeStream sends extraBody fields to the model server', async () => {
    const stream = await createConnector(extraBody).invokeStream({ messages }, usageCollector());
    await drain(stream as unknown as NodeJS.ReadableStream);

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      chat_template_kwargs: { enable_thinking: false },
      top_k: 20,
      temperature: 0.7,
      messages,
      model: 'qwen3',
      stream: true,
    });
  });

  it('invokeAsyncIterator sends extraBody fields to the model server', async () => {
    const { consumerStream } = await createConnector(extraBody).invokeAsyncIterator(
      { messages, timeout: 60000 },
      usageCollector()
    );
    for await (const _ of consumerStream) {
      // consume
    }

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      chat_template_kwargs: { enable_thinking: false },
      top_k: 20,
      temperature: 0.7,
      messages,
      model: 'qwen3',
      stream: true,
    });
  });

  describe('undefined and null request values', () => {
    it('invokeAsyncIterator keeps the extraBody value when the request value is undefined', async () => {
      const { consumerStream } = await createConnector(extraBody).invokeAsyncIterator(
        { messages, temperature: undefined, timeout: 60000 },
        usageCollector()
      );
      for await (const _ of consumerStream) {
        // consume
      }

      expect(received[0].temperature).toBe(0.7);
      expect(received[0].top_k).toBe(20);
    });

    it('invokeAsyncIterator lets an explicit request value win over extraBody', async () => {
      const { consumerStream } = await createConnector(extraBody).invokeAsyncIterator(
        { messages, temperature: 0, timeout: 60000 },
        usageCollector()
      );
      for await (const _ of consumerStream) {
        // consume
      }

      expect(received[0].temperature).toBe(0);
    });

    it('runApi keeps the extraBody value when the request value is undefined', async () => {
      await createConnector(extraBody).runApi(
        { body: JSON.stringify({ messages, temperature: undefined }) },
        usageCollector()
      );

      expect(received[0].temperature).toBe(0.7);
    });

    it('runApi lets an explicit request value, including null, win over extraBody', async () => {
      await createConnector(extraBody).runApi(
        { body: JSON.stringify({ messages, temperature: 0 }) },
        usageCollector()
      );
      expect(received[0].temperature).toBe(0);

      await createConnector(extraBody).runApi(
        { body: JSON.stringify({ messages, temperature: null }) },
        usageCollector()
      );
      expect(received[1].temperature).toBeNull();
    });

    it('streamApi keeps the extraBody value when the request value is undefined', async () => {
      const stream = await createConnector(extraBody).streamApi(
        { body: JSON.stringify({ messages, temperature: undefined }), stream: true },
        usageCollector()
      );
      await drain(stream as unknown as NodeJS.ReadableStream);

      expect(received[0].temperature).toBe(0.7);
    });

    it('streamApi lets an explicit request value win over extraBody', async () => {
      const stream = await createConnector(extraBody).streamApi(
        { body: JSON.stringify({ messages, temperature: 0 }), stream: true },
        usageCollector()
      );
      await drain(stream as unknown as NodeJS.ReadableStream);

      expect(received[0].temperature).toBe(0);
    });
  });

  it('deep-merges nested objects, keeping request values', async () => {
    await createConnector({
      chat_template_kwargs: { enable_thinking: false, foo: 'bar' },
    }).runApi(
      {
        body: JSON.stringify({ messages, chat_template_kwargs: { enable_thinking: true } }),
      },
      usageCollector()
    );

    expect(received[0].chat_template_kwargs).toEqual({ enable_thinking: true, foo: 'bar' });
  });

  it('sends the request body unchanged when extraBody is not configured', async () => {
    await createConnector().invokeAI({ messages }, usageCollector());

    expect(received[0]).toEqual({ messages, model: 'qwen3', stream: false });
  });
});
