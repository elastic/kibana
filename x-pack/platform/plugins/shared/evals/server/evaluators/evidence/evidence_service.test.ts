/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createTraceAccessor } from '../trace_accessor';
import { normalizeEvidence } from './evidence_service';
import { getInstrumentationProfile } from './resolve_instrumentation';

describe('normalizeEvidence', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';

  const createEsClient = () => {
    const searchMock = jest.fn();
    const esClient = {
      search: searchMock,
    } as unknown as ElasticsearchClient;
    return { esClient, searchMock };
  };

  it('normalizes elastic-inference docs stored with dotted attribute keys', async () => {
    const mapping = getInstrumentationProfile('elastic-inference');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    // Mirrors the real `_source` shape returned by ES: a nested `attributes`
    // object whose keys are dotted (partially flattened OTLP attributes).
    searchMock
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.000Z',
                attributes: {
                  'gen_ai.input.messages': JSON.stringify([
                    {
                      role: 'user',
                      parts: [{ type: 'text', content: 'What is the payment status?' }],
                    },
                  ]),
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:01.000Z',
                attributes: {
                  'gen_ai.output.messages': JSON.stringify([
                    {
                      role: 'assistant',
                      parts: [{ type: 'text', content: 'Payment service is healthy.' }],
                    },
                  ]),
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.500Z',
                attributes: {
                  'gen_ai.tool.call.id': 'call-1',
                  'gen_ai.tool.name': 'health_check',
                  'gen_ai.tool.call.arguments': '{"service":"payments"}',
                  'gen_ai.tool.call.result': '{"status":"healthy"}',
                },
              },
            },
          ],
        },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: 'What is the payment status?' },
      response: { message: 'Payment service is healthy.' },
      steps: [
        {
          tool_call_id: 'call-1',
          tool_id: 'health_check',
          arguments: { service: 'payments' },
          result: { status: 'healthy' },
        },
      ],
    });
  });

  it('does not add exists filter for message content fields', async () => {
    const mapping = getInstrumentationProfile('elastic-inference');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock.mockResolvedValue({
      hits: {
        hits: [],
      },
    });

    await normalizeEvidence(traceAccessor, mapping);

    const userSearchRequest = searchMock.mock.calls[0][0];
    const filters =
      (userSearchRequest.query as { bool?: { filter?: unknown[] } })?.bool?.filter ?? [];
    expect(filters).not.toEqual(
      expect.arrayContaining([{ exists: { field: mapping.user_query.contentField } }])
    );
    expect(filters).toEqual(
      expect.arrayContaining([{ term: { 'attributes.elastic.inference.span.kind': 'LLM' } }])
    );
    expect(userSearchRequest.size).toBe(20);
  });

  it('skips empty first genai_messages hit and returns later hit with content', async () => {
    const mapping = getInstrumentationProfile('elastic-inference');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.000Z',
              },
            },
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:01.000Z',
                attributes: {
                  'gen_ai.input.messages': JSON.stringify([
                    {
                      role: 'user',
                      parts: [{ type: 'text', content: 'non-redacted user query' }],
                    },
                  ]),
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: 'non-redacted user query' },
      response: { message: '' },
      steps: [],
    });
  });

  it('joins multiple genai text parts and ignores non-text parts', async () => {
    const mapping = getInstrumentationProfile('elastic-inference');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.000Z',
                attributes: {
                  'gen_ai.input.messages': JSON.stringify([
                    {
                      role: 'user',
                      parts: [
                        { type: 'text', content: 'First question part.' },
                        { type: 'text', content: 'Second question part.' },
                      ],
                    },
                  ]),
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:01.000Z',
                attributes: {
                  'gen_ai.output.messages': JSON.stringify([
                    {
                      role: 'assistant',
                      parts: [
                        { type: 'text', content: 'Here is the answer.' },
                        {
                          type: 'tool_call',
                          content: '{"name":"lookup","arguments":{}}',
                        },
                        { type: 'text', content: 'And a follow-up.' },
                        { type: 'reasoning', content: 'internal thought' },
                      ],
                    },
                  ]),
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: 'First question part.\n\nSecond question part.' },
      response: { message: 'Here is the answer.\n\nAnd a follow-up.' },
      steps: [],
    });
  });

  it('reads long otel-genai-events user content from _source without exists filter', async () => {
    const mapping = getInstrumentationProfile('otel-genai-events');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });
    const longUserPrompt = `${'passage '.repeat(800)}Question: What is our work from home policy?`;

    searchMock
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-14T09:24:14.340Z',
                body: { structured: { content: longUserPrompt } },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-14T09:24:18.985Z',
                body: {
                  structured: {
                    message: { content: 'Eligible employees may work remotely with approval.' },
                  },
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: longUserPrompt },
      response: { message: 'Eligible employees may work remotely with approval.' },
      steps: [],
    });

    const userSearchRequest = searchMock.mock.calls[0][0];
    const filters =
      (userSearchRequest.query as { bool?: { filter?: unknown[] } })?.bool?.filter ?? [];
    expect(filters).toEqual([
      { term: { trace_id: traceId } },
      { term: { event_name: 'gen_ai.user.message' } },
    ]);
  });

  it('resolves fields regardless of flattened, nested, or dotted-key document shape', async () => {
    const mapping = getInstrumentationProfile('otel-genai-events');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock
      // fully flattened root key
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.000Z',
                'body.structured.content': 'flattened question',
              },
            },
          ],
        },
      })
      // fully nested objects
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:01.000Z',
                body: { structured: { message: { content: 'nested answer' } } },
              },
            },
          ],
        },
      })
      // dotted key nested under attributes
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.500Z',
                attributes: {
                  'gen_ai.tool.call.id': 'call-1',
                  'gen_ai.tool.name': 'health_check',
                },
              },
            },
          ],
        },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: 'flattened question' },
      response: { message: 'nested answer' },
      steps: [{ tool_call_id: 'call-1', tool_id: 'health_check' }],
    });
  });

  it('normalizes otel-genai-attributes chat span messages', async () => {
    const mapping = getInstrumentationProfile('otel-genai-attributes');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.000Z',
                attributes: {
                  'gen_ai.input.messages': JSON.stringify([
                    {
                      role: 'system',
                      parts: [{ type: 'text', content: 'system context' }],
                    },
                    {
                      role: 'user',
                      parts: [{ type: 'text', content: 'How many failed payments today?' }],
                    },
                  ]),
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:01.000Z',
                attributes: {
                  'gen_ai.output.messages': [
                    {
                      role: 'assistant',
                      parts: [{ type: 'text', content: 'There were 12 failed payments today.' }],
                    },
                  ],
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.500Z',
                attributes: {
                  'gen_ai.tool.call.id': 'call-2',
                  'gen_ai.tool.name': 'payments_summary',
                  'gen_ai.tool.call.arguments': '{"window":"24h"}',
                  'gen_ai.tool.call.result': '{"failed_count":12}',
                },
              },
            },
          ],
        },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: 'How many failed payments today?' },
      response: { message: 'There were 12 failed payments today.' },
      steps: [
        {
          tool_call_id: 'call-2',
          tool_id: 'payments_summary',
          arguments: { window: '24h' },
          result: { failed_count: 12 },
        },
      ],
    });
  });

  it('parses anthropic message content arrays and joins text blocks', async () => {
    const mapping = {
      ...getInstrumentationProfile('elastic-inference'),
      agent_response: {
        ...getInstrumentationProfile('elastic-inference').agent_response,
        contentField: 'attributes.body',
        parse: 'anthropic_message' as const,
      },
    };
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [] },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-14T12:00:01.000Z',
                attributes: {
                  body: JSON.stringify({
                    role: 'assistant',
                    content: [
                      { type: 'text', text: 'First block' },
                      { type: 'tool_use', id: 'toolu_123', name: 'Shell' },
                      { type: 'text', text: 'Second block' },
                    ],
                  }),
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: { hits: [] },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: '' },
      response: { message: 'First block\n\nSecond block' },
      steps: [],
    });
  });

  it('parses anthropic message content-as-string', async () => {
    const mapping = {
      ...getInstrumentationProfile('elastic-inference'),
      agent_response: {
        ...getInstrumentationProfile('elastic-inference').agent_response,
        contentField: 'attributes.body',
        parse: 'anthropic_message' as const,
      },
    };
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [] },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-14T12:00:01.000Z',
                attributes: {
                  body: JSON.stringify({
                    role: 'assistant',
                    content: 'Plain response',
                  }),
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: { hits: [] },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: '' },
      response: { message: 'Plain response' },
      steps: [],
    });
  });

  it('returns empty response for anthropic tool_use-only and invalid JSON documents', async () => {
    const mapping = {
      ...getInstrumentationProfile('elastic-inference'),
      agent_response: {
        ...getInstrumentationProfile('elastic-inference').agent_response,
        contentField: 'attributes.body',
        parse: 'anthropic_message' as const,
      },
    };
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [] },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-14T12:00:02.000Z',
                attributes: {
                  body: '{not-valid-json',
                },
              },
            },
            {
              _source: {
                '@timestamp': '2026-07-14T12:00:01.000Z',
                attributes: {
                  body: JSON.stringify({
                    role: 'assistant',
                    content: [{ type: 'tool_use', id: 'toolu_123', name: 'Shell' }],
                  }),
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: { hits: [] },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: '' },
      response: { message: '' },
      steps: [],
    });
  });

  it('strips prefixed tool payloads and parses JSON when prefixed_json is enabled', async () => {
    const mapping = {
      ...getInstrumentationProfile('elastic-inference'),
      tool_calls: {
        ...getInstrumentationProfile('elastic-inference').tool_calls,
        parse: 'prefixed_json' as const,
      },
    };
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [] },
      })
      .mockResolvedValueOnce({
        hits: { hits: [] },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-14T12:00:01.000Z',
                attributes: {
                  'gen_ai.tool.call.id': 'call-1',
                  'gen_ai.tool.name': 'shell',
                  'gen_ai.tool.call.arguments': '[TOOL INPUT: Shell]\n{"command":"ls"}',
                  'gen_ai.tool.call.result': '[TOOL RESULT: Shell]\nplain output',
                },
              },
            },
            {
              _source: {
                '@timestamp': '2026-07-14T12:00:02.000Z',
                attributes: {
                  'gen_ai.tool.call.id': 'call-2',
                  'gen_ai.tool.name': 'shell',
                  'gen_ai.tool.call.arguments': '{"command":"pwd"}',
                  'gen_ai.tool.call.result': '{"cwd":"/tmp"}',
                },
              },
            },
          ],
        },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: '' },
      response: { message: '' },
      steps: [
        {
          tool_call_id: 'call-1',
          tool_id: 'shell',
          arguments: { command: 'ls' },
          result: 'plain output',
        },
        {
          tool_call_id: 'call-2',
          tool_id: 'shell',
          arguments: { command: 'pwd' },
          result: { cwd: '/tmp' },
        },
      ],
    });
  });

  it('keeps prefixed payloads unchanged when parse mode is not set', async () => {
    const mapping = getInstrumentationProfile('elastic-inference');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [] },
      })
      .mockResolvedValueOnce({
        hits: { hits: [] },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-14T12:00:01.000Z',
                attributes: {
                  'gen_ai.tool.call.id': 'call-1',
                  'gen_ai.tool.name': 'shell',
                  'gen_ai.tool.call.arguments': '[TOOL INPUT: Shell]\n{"command":"ls"}',
                  'gen_ai.tool.call.result': '[TOOL RESULT: Shell]\n{"ok":true}',
                },
              },
            },
          ],
        },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: '' },
      response: { message: '' },
      steps: [
        {
          tool_call_id: 'call-1',
          tool_id: 'shell',
          arguments: '[TOOL INPUT: Shell]\n{"command":"ls"}',
          result: '[TOOL RESULT: Shell]\n{"ok":true}',
        },
      ],
    });
  });
});
