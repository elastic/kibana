/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import { ChatCompletionEventType, MessageRole } from '@kbn/inference-common';
import { registerGenerateRoute } from './generate_route';

jest.mock('../utils/esql_query', () => ({
  ...jest.requireActual('../utils/esql_query'),
  runEsqlQuery: jest.fn(),
}));

const { runEsqlQuery } = jest.requireMock('../utils/esql_query');

const chunkEvent = (content: string) => ({
  type: ChatCompletionEventType.ChatCompletionChunk,
  content,
});

async function readNdjson(stream: NodeJS.ReadableStream): Promise<unknown[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks)
    .toString('utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function buildMocks() {
  const handler = jest.fn();
  const router = {
    post: jest.fn((_config, h) => {
      handler.mockImplementation(h);
    }),
  };

  const chatComplete = jest.fn();
  const getDefaultConnector = jest.fn();
  const getClient = jest.fn(() => ({ chatComplete }));
  const inference = { getDefaultConnector, getClient };
  const getStartServices = jest.fn().mockResolvedValue([{}, { inference }]);

  const context = {
    core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: {} } } }),
  };

  const abortedUnsubscribe = jest.fn();
  const request = {
    body: {
      prompt: 'Show KPI cards',
      esqlQuery: undefined as string | undefined,
      timeRange: undefined,
      colorMode: 'LIGHT',
    },
    events: {
      aborted$: { subscribe: jest.fn(() => ({ unsubscribe: abortedUnsubscribe })) },
    },
  };

  const response = {
    ok: jest.fn((r) => r),
    badRequest: jest.fn((r) => ({ status: 400, ...r })),
  };

  return {
    router: router as unknown as Parameters<typeof registerGenerateRoute>[0],
    handler,
    getStartServices: getStartServices as unknown as Parameters<typeof registerGenerateRoute>[1],
    context,
    request,
    response,
    chatComplete,
    getDefaultConnector,
    abortedUnsubscribe,
  };
}

describe('registerGenerateRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a POST handler at the internal generate path', () => {
    const { router, getStartServices } = buildMocks();
    registerGenerateRoute(router, getStartServices);

    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/internal/ai_panel/generate' }),
      expect.any(Function)
    );
  });

  it('returns 400 and never calls the LLM when no connector is configured', async () => {
    const {
      router,
      handler,
      getStartServices,
      context,
      request,
      response,
      getDefaultConnector,
      chatComplete,
    } = buildMocks();
    registerGenerateRoute(router, getStartServices);
    getDefaultConnector.mockRejectedValue(new Error('no connector'));

    await handler(context, request, response);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: 'No inference connector configured',
    });
    expect(chatComplete).not.toHaveBeenCalled();
  });

  it('streams tokens for a static (non-ES|QL) prompt, prefixed with the CSP meta tag', async () => {
    const {
      router,
      handler,
      getStartServices,
      context,
      request,
      response,
      getDefaultConnector,
      chatComplete,
      abortedUnsubscribe,
    } = buildMocks();
    registerGenerateRoute(router, getStartServices);
    getDefaultConnector.mockResolvedValue({ connectorId: 'connector-1' });
    chatComplete.mockReturnValue(of(chunkEvent('<div>'), chunkEvent('hello</div>')));

    await handler(context, request, response);

    const events = await readNdjson(response.ok.mock.results[0].value.body);
    expect(events).toEqual([
      { token: expect.stringContaining('Content-Security-Policy') },
      { token: '<div>' },
      { token: 'hello</div>' },
    ]);

    const [{ system, messages }] = chatComplete.mock.calls[0];
    expect(system).toContain('OUTPUT RULES');
    expect(messages).toEqual([{ role: MessageRole.User, content: 'Show KPI cards' }]);
    expect(abortedUnsubscribe).toHaveBeenCalled();
  });

  it('builds a Liquid template prompt with schema and sample rows when esqlQuery succeeds', async () => {
    const {
      router,
      handler,
      getStartServices,
      context,
      request,
      response,
      getDefaultConnector,
      chatComplete,
    } = buildMocks();
    registerGenerateRoute(router, getStartServices);
    getDefaultConnector.mockResolvedValue({ connectorId: 'connector-1' });
    runEsqlQuery.mockResolvedValue({
      columns: [{ name: 'category', type: 'keyword' }],
      rows: [['electronics'], ['clothing']],
    });
    chatComplete.mockReturnValue(of(chunkEvent('{{row.category}}')));

    request.body = { ...request.body, esqlQuery: 'FROM ecommerce | STATS count() BY category' };
    await handler(context, request, response);

    // No CSP prefix for template panels — CSP is injected client-side after the placeholder fill.
    const events = await readNdjson(response.ok.mock.results[0].value.body);
    expect(events).toEqual([{ token: '{{row.category}}' }]);

    const [{ system, messages }] = chatComplete.mock.calls[0];
    expect(system).toContain('Liquid template syntax');
    expect(messages[0].content).toContain('category (keyword) → placeholder: {{category}}');
    expect(messages[0].content).toContain('electronics');
  });

  it('falls back to a schema-less template prompt when the ES|QL query fails (non-fatal)', async () => {
    const {
      router,
      handler,
      getStartServices,
      context,
      request,
      response,
      getDefaultConnector,
      chatComplete,
    } = buildMocks();
    registerGenerateRoute(router, getStartServices);
    getDefaultConnector.mockResolvedValue({ connectorId: 'connector-1' });
    runEsqlQuery.mockRejectedValue(new Error('ES|QL failed'));
    chatComplete.mockReturnValue(of(chunkEvent('<div></div>')));

    request.body = { ...request.body, esqlQuery: 'FROM ecommerce' };
    await handler(context, request, response);

    expect(response.badRequest).not.toHaveBeenCalled();
    const [{ messages }] = chatComplete.mock.calls[0];
    expect(messages[0].content).toContain('schema unavailable');
  });

  it('aborts and emits a single error once the streamed HTML exceeds the size limit', async () => {
    const {
      router,
      handler,
      getStartServices,
      context,
      request,
      response,
      getDefaultConnector,
      chatComplete,
    } = buildMocks();
    registerGenerateRoute(router, getStartServices);
    getDefaultConnector.mockResolvedValue({ connectorId: 'connector-1' });

    const oversizedChunk = 'a'.repeat(500_001);
    chatComplete.mockReturnValue(of(chunkEvent(oversizedChunk), chunkEvent('should be dropped')));

    await handler(context, request, response);

    const events = await readNdjson(response.ok.mock.results[0].value.body);
    expect(events).toEqual([
      { token: expect.stringContaining('Content-Security-Policy') },
      { error: 'Generated content exceeded size limit' },
    ]);
  });

  it('emits an error line and ends the stream when the inference call errors', async () => {
    const {
      router,
      handler,
      getStartServices,
      context,
      request,
      response,
      getDefaultConnector,
      chatComplete,
    } = buildMocks();
    registerGenerateRoute(router, getStartServices);
    getDefaultConnector.mockResolvedValue({ connectorId: 'connector-1' });
    chatComplete.mockReturnValue(throwError(() => new Error('inference failed')));

    await handler(context, request, response);

    const events = await readNdjson(response.ok.mock.results[0].value.body);
    expect(events).toEqual([
      { token: expect.stringContaining('Content-Security-Policy') },
      { error: 'inference failed' },
    ]);
  });
});
