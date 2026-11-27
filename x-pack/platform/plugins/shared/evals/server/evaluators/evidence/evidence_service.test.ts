/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  getOpenllmetryLangchainSpans,
  OPENLLMETRY_LANGCHAIN_TRACE_IDS,
} from '../../routes/evaluators/test_helpers';
import { createTraceAccessor } from '../trace_accessor';
import {
  extractEvidence,
  extractSelectedEvidence,
  getRecommendedInstrumentationProfile,
  hasResolvedEvidence,
  hasRootSpan,
  normalizeEvidence,
} from './evidence_service';
import { getInstrumentationProfile } from './resolve_instrumentation';
import type { ToolCallEvidence } from './types';

describe('normalizeEvidence', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';
  const EMPTY_ROUND = {
    input: { message: '' },
    response: { message: '' },
    steps: [],
  };

  const createEsClient = () => {
    const searchMock = jest.fn();
    const esClient = {
      search: searchMock,
    } as unknown as ElasticsearchClient;
    return { esClient, searchMock };
  };

  it('returns normalization and probe statuses from one search pass', async () => {
    const mapping = getInstrumentationProfile('elastic-inference');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });
    searchMock
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                attributes: {
                  'gen_ai.input.messages': [
                    { role: 'user', parts: [{ type: 'text', content: 'hello' }] },
                  ],
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({ hits: { hits: [{ _source: {} }] } })
      .mockResolvedValueOnce({ hits: { hits: [] } });

    await expect(extractEvidence(traceAccessor, mapping)).resolves.toEqual({
      round: {
        input: { message: 'hello' },
        response: { message: '' },
        steps: [],
      },
      evidence: {
        user_query: expect.objectContaining({ status: 'found' }),
        agent_response: expect.objectContaining({ status: 'content_redacted' }),
        tool_calls: expect.objectContaining({ status: 'not_found' }),
      },
    });
    expect(searchMock).toHaveBeenCalledTimes(3);
    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          { '@timestamp': { order: 'asc' } },
          { span_id: { order: 'asc', unmapped_type: 'keyword' } },
        ],
      })
    );
    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          { '@timestamp': { order: 'desc' } },
          { span_id: { order: 'desc', unmapped_type: 'keyword' } },
        ],
      })
    );
  });

  it('uses hit identity to order equal-timestamp documents without span IDs', async () => {
    const mapping = getInstrumentationProfile('otel-genai-events');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });
    const timestamp = '2026-07-14T09:24:14.340Z';
    const sort = [1784021054340, null];

    searchMock
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'message-b',
              _index: 'logs-generic.otel-default',
              sort,
              _source: { '@timestamp': timestamp, body: { structured: { content: 'second' } } },
            },
            {
              _id: 'message-a',
              _index: 'logs-generic.otel-default',
              sort,
              _source: { '@timestamp': timestamp, body: { structured: { content: 'first' } } },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'response-a',
              _index: 'logs-generic.otel-default',
              sort,
              _source: {
                '@timestamp': timestamp,
                body: { structured: { message: { content: 'earlier identity' } } },
              },
            },
            {
              _id: 'response-b',
              _index: 'logs-generic.otel-default',
              sort,
              _source: {
                '@timestamp': timestamp,
                body: { structured: { message: { content: 'later identity' } } },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'tool-b',
              _index: 'traces-generic.otel-default',
              sort,
              _source: {
                '@timestamp': timestamp,
                attributes: {
                  'gen_ai.tool.call.id': 'call-b',
                  'gen_ai.tool.name': 'tool-b',
                },
              },
            },
            {
              _id: 'tool-a',
              _index: 'traces-generic.otel-default',
              sort,
              _source: {
                '@timestamp': timestamp,
                attributes: {
                  'gen_ai.tool.call.id': 'call-a',
                  'gen_ai.tool.name': 'tool-a',
                },
              },
            },
          ],
        },
      });

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: 'first' },
      response: { message: 'later identity' },
      steps: [
        { tool_call_id: 'call-a', tool_id: 'tool-a' },
        { tool_call_id: 'call-b', tool_id: 'tool-b' },
      ],
    });
  });

  it('expands beyond the initial candidate page before ordering equal-timestamp messages', async () => {
    const mapping = getInstrumentationProfile('otel-genai-events');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });
    const timestamp = '2026-07-14T09:24:14.340Z';
    const sort = [1784021054340, null];

    const createCandidates = (kind: 'user' | 'response') =>
      Array.from({ length: 25 }, (_, index) => {
        const suffix = String(index).padStart(2, '0');
        return {
          _id: `${kind}-${suffix}`,
          _index: 'logs-generic.otel-default',
          sort,
          _source: {
            '@timestamp': timestamp,
            body: {
              structured:
                kind === 'user'
                  ? { content: `question-${suffix}` }
                  : { message: { content: `answer-${suffix}` } },
            },
          },
        };
      });

    searchMock.mockImplementation(
      ({
        index,
        query,
        size,
      }: {
        index: string;
        query: { bool: { filter: unknown[] } };
        size: number;
      }) => {
        if (index === 'traces-*') {
          return Promise.resolve({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } });
        }

        const eventName = query.bool.filter
          .map((filter) => (filter as { term?: Record<string, string> }).term?.event_name)
          .find(Boolean);
        const candidates = createCandidates(
          eventName === 'gen_ai.user.message' ? 'user' : 'response'
        );
        const hits = size === 20 ? candidates.slice(2, 22).reverse() : candidates.reverse();
        return Promise.resolve({
          hits: { total: { value: candidates.length, relation: 'eq' }, hits },
        });
      }
    );

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: 'question-00' },
      response: { message: 'answer-24' },
      steps: [],
    });

    const expandedMessageSearches = searchMock.mock.calls.filter(
      ([request]) => request.index === 'logs-*' && request.size === 200
    );
    expect(expandedMessageSearches).toHaveLength(2);
    expect(expandedMessageSearches.map(([request]) => request.track_total_hits)).toEqual([
      false,
      false,
    ]);
    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ track_total_hits: 21 }));
  });

  it('keeps resolving evidence when more than 200 message candidates exist', async () => {
    const mapping = getInstrumentationProfile('otel-genai-events');
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });

    searchMock.mockImplementation(
      ({
        index,
        query,
        size,
      }: {
        index: string;
        query: { bool: { filter: unknown[] } };
        size: number;
      }) => {
        if (index === 'traces-*') {
          return Promise.resolve({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } });
        }

        const eventName = query.bool.filter
          .map((filter) => (filter as { term?: Record<string, string> }).term?.event_name)
          .find(Boolean);
        const isUserMessage = eventName === 'gen_ai.user.message';
        const candidates = Array.from({ length: 201 }, (_, candidateIndex) => ({
          _id: `${isUserMessage ? 'user' : 'response'}-${candidateIndex}`,
          _index: 'logs-generic.otel-default',
          sort: [candidateIndex, null],
          _source: {
            '@timestamp': new Date(candidateIndex).toISOString(),
            body: {
              structured: isUserMessage
                ? { content: `question-${candidateIndex}` }
                : { message: { content: `answer-${candidateIndex}` } },
            },
          },
        }));
        const orderedCandidates = isUserMessage ? candidates : candidates.reverse();
        return Promise.resolve({
          hits: {
            total: { value: 21, relation: 'gte' },
            hits: orderedCandidates.slice(0, size),
          },
        });
      }
    );

    await expect(normalizeEvidence(traceAccessor, mapping)).resolves.toEqual({
      input: { message: 'question-0' },
      response: { message: 'answer-200' },
      steps: [],
    });

    expect(
      searchMock.mock.calls.filter(
        ([request]) => request.index === 'logs-*' && request.size === 200
      )
    ).toHaveLength(2);
  });

  it('uses the shared evidence gate and profile recommendation rules', () => {
    expect(hasResolvedEvidence({ ...EMPTY_ROUND, input: { message: 'hello' } })).toBe(true);
    expect(hasResolvedEvidence({ ...EMPTY_ROUND, response: { message: 'world' } })).toBe(true);
    expect(hasResolvedEvidence({ ...EMPTY_ROUND, steps: [{ tool_id: 'search' }] })).toBe(true);
    expect(hasResolvedEvidence(EMPTY_ROUND)).toBe(false);

    expect(
      getRecommendedInstrumentationProfile([
        {
          profile: 'otel-genai-events',
          evidence: {
            user_query: { status: 'found' },
            agent_response: { status: 'not_found' },
            tool_calls: { status: 'found' },
          },
        },
        {
          profile: 'elastic-inference',
          evidence: {
            user_query: { status: 'found' },
            agent_response: { status: 'found' },
            tool_calls: { status: 'not_found' },
          },
        },
      ])
    ).toBe('elastic-inference');
  });

  it('returns the recommended auto-detected round without a normalization re-query', async () => {
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });
    searchMock.mockImplementation(({ index }: { index: string }) =>
      Promise.resolve(
        index === 'traces-*'
          ? {
              hits: {
                hits: [
                  {
                    _source: {
                      attributes: {
                        'gen_ai.input.messages': [
                          { role: 'user', parts: [{ type: 'text', content: 'hello' }] },
                        ],
                        'gen_ai.output.messages': [
                          { role: 'assistant', parts: [{ type: 'text', content: 'world' }] },
                        ],
                      },
                    },
                  },
                ],
              },
            }
          : { hits: { hits: [] } }
      )
    );

    const selection = await extractSelectedEvidence(traceAccessor);

    expect(selection.selected).toEqual(
      expect.objectContaining({
        profile: 'elastic-inference',
        round: expect.objectContaining({
          input: { message: 'hello' },
          response: { message: 'world' },
        }),
      })
    );
    expect(searchMock).toHaveBeenCalledTimes(14);
    // otel-genai-events and otel-genai-attributes share one execute_tool search;
    // openllmetry-langchain adds a scope.name filter, so it runs its own.
    const executeToolSearches = searchMock.mock.calls.filter(
      ([request]) =>
        request.query.bool.filter.length === 2 &&
        request.query.bool.filter.some(
          (filter: Record<string, unknown>) =>
            (filter.term as Record<string, unknown> | undefined)?.[
              'attributes.gen_ai.operation.name'
            ] === 'execute_tool'
        )
    );
    expect(executeToolSearches).toHaveLength(1);
  });

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

  const LANGCHAIN_TRACES = OPENLLMETRY_LANGCHAIN_TRACE_IDS;

  describe('langchain_envelope tool payloads', () => {
    const baseMapping = getInstrumentationProfile('otel-genai-attributes');
    const langchainMapping = {
      ...baseMapping,
      tool_calls: { ...baseMapping.tool_calls, parse: 'langchain_envelope' as const },
    };

    const getToolSpans = (fixtureTraceId: string): Array<Record<string, unknown>> =>
      getOpenllmetryLangchainSpans(fixtureTraceId).filter(
        (span) =>
          (span.attributes as Record<string, unknown>)['gen_ai.operation.name'] === 'execute_tool'
      );

    const buildToolSpan = (
      second: number,
      attributes: Record<string, unknown>
    ): Record<string, unknown> => ({
      '@timestamp': `2026-11-27T12:00:0${second}.000Z`,
      attributes: {
        'gen_ai.operation.name': 'execute_tool',
        'gen_ai.tool.name': 'some_tool',
        ...attributes,
      },
    });

    const normalizeSteps = async (
      toolSpans: Array<Record<string, unknown>>,
      mapping: typeof baseMapping = langchainMapping
    ) => {
      const { esClient, searchMock } = createEsClient();
      const traceAccessor = createTraceAccessor({ traceId, esClient });
      searchMock
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce({
          hits: { hits: toolSpans.map((span) => ({ _source: span })) },
        });
      const { steps } = await normalizeEvidence(traceAccessor, mapping);
      return steps;
    };

    it('unwraps inputs, lifts tool_call_id and joins and parses MCP text blocks', async () => {
      const steps = await normalizeSteps(getToolSpans(LANGCHAIN_TRACES.mcpTool));

      expect(steps).toHaveLength(1);
      const [{ result, ...step }] = steps;
      expect(step).toEqual({
        tool_call_id: 'toolu_01JCNeSqFzLuXb9LadRKmEtj',
        tool_id: 'platform_core_list_indices',
        arguments: {},
      });
      expect(result).toEqual({
        results: [expect.objectContaining({ type: 'other', data: expect.any(Object) })],
      });
    });

    it('keeps string content and never reads input_str', async () => {
      const [readFileSpan] = getToolSpans(LANGCHAIN_TRACES.readFile);
      const attributes = readFileSpan.attributes as Record<string, unknown>;
      const envelope = JSON.parse(attributes['gen_ai.tool.call.arguments'] as string);
      attributes['gen_ai.tool.call.arguments'] = JSON.stringify({
        ...envelope,
        input_str: '{"file_path": "/not/read"}',
      });

      const [step] = await normalizeSteps([readFileSpan]);

      expect(step.tool_id).toBe('read_file');
      expect(step.tool_call_id).toBe('toolu_01VfEtP9mQEKL8p653H2xeDT');
      expect(step.arguments).toEqual({
        file_path: '/skills/esql-investigation/SKILL.md',
        limit: 1000,
      });
      expect(step.result).toEqual(expect.stringMatching(/^ {5}1\t---\n {5}2\tname: esql/));
    });

    it('takes content from Command update messages for write_todos', async () => {
      const steps = await normalizeSteps(getToolSpans(LANGCHAIN_TRACES.writeTodos));

      expect(steps.map(({ tool_id: toolId }) => toolId)).toEqual([
        'write_todos',
        'platform_core_list_indices',
        'write_todos',
        'write_todos',
      ]);
      expect(steps[0]).toEqual({
        tool_call_id: 'toolu_0148BSaWXK3UtX9EdKjUVhAu',
        tool_id: 'write_todos',
        arguments: {
          todos: [
            { content: 'List the indices', status: 'in_progress' },
            { content: 'Report how many indices there are', status: 'pending' },
          ],
        },
        result:
          "Updated todo list to [{'content': 'List the indices', 'status': 'in_progress'}, " +
          "{'content': 'Report how many indices there are', 'status': 'pending'}]",
      });
    });

    it('takes the sub-agent answer from Command update messages for task', async () => {
      const steps = await normalizeSteps(getToolSpans(LANGCHAIN_TRACES.subAgent));

      expect(steps.map(({ tool_id: toolId }) => toolId)).toEqual([
        'task',
        'platform_core_list_indices',
      ]);
      const [taskStep] = steps;
      expect(taskStep.tool_call_id).toBe('toolu_01JwRv5DeqrZnbKgW56FHiri');
      expect(taskStep.arguments).toEqual(
        expect.objectContaining({ subagent_type: 'general-purpose' })
      );
      expect(taskStep.result).toEqual(
        expect.stringMatching(/^Here is the full report based on the results/)
      );
    });

    it('keeps a raised tool error step without a result', async () => {
      const steps = await normalizeSteps(getToolSpans(LANGCHAIN_TRACES.raisedToolError));

      expect(steps).toEqual([
        {
          tool_call_id: 'toolu_017NDvXXswUGZ8uQjrZ3LVb5',
          tool_id: 'platform_core_get_index_mapping',
          arguments: { indices: '42' },
        },
      ]);
    });

    it('parses a soft MCP error like any MCP result', async () => {
      const steps = await normalizeSteps(getToolSpans(LANGCHAIN_TRACES.softMcpError));

      expect(steps).toEqual([
        {
          tool_call_id: 'toolu_01Gpdxr5RdfEgTfgn1qejNUd',
          tool_id: 'platform_core_execute_esql',
          arguments: { query: 'FROM this-index-does-not-exist-xyz | LIMIT 1' },
          result: {
            results: [
              expect.objectContaining({
                type: 'error',
                data: { message: expect.stringContaining('Unknown index') },
              }),
            ],
          },
        },
      ]);
    });

    it('prefers the tool_call_id field, then falls back to the ToolMessage tool_call_id', async () => {
      const toolMessage = {
        lc: 1,
        type: 'constructor',
        id: ['langchain', 'schema', 'messages', 'ToolMessage'],
        kwargs: { content: 'ok', type: 'tool', tool_call_id: 'from-tool-message' },
      };

      const steps = await normalizeSteps([
        buildToolSpan(1, {
          'gen_ai.tool.call.id': 'from-field',
          'gen_ai.tool.call.arguments': JSON.stringify({
            inputs: { q: 1 },
            kwargs: { tool_call_id: 'from-arguments' },
          }),
          'gen_ai.tool.call.result': JSON.stringify({ output: toolMessage }),
        }),
        buildToolSpan(2, {
          'gen_ai.tool.call.arguments': JSON.stringify({ inputs: { q: 2 }, kwargs: {} }),
          'gen_ai.tool.call.result': JSON.stringify({ output: toolMessage }),
        }),
      ]);

      expect(steps).toEqual([
        { tool_call_id: 'from-field', tool_id: 'some_tool', arguments: { q: 1 }, result: 'ok' },
        {
          tool_call_id: 'from-tool-message',
          tool_id: 'some_tool',
          arguments: { q: 2 },
          result: 'ok',
        },
      ]);
    });

    it('falls back to the parsed raw value for unrecognized envelopes', async () => {
      const steps = await normalizeSteps([
        buildToolSpan(1, {
          'gen_ai.tool.call.arguments': '{"query":"x"}',
          'gen_ai.tool.call.result': '{"output":{"rows":2}}',
        }),
        buildToolSpan(2, {
          'gen_ai.tool.call.arguments': JSON.stringify({ inputs: null, input_str: 'raw' }),
          'gen_ai.tool.call.result': 'plain text',
        }),
        buildToolSpan(3, {
          'gen_ai.tool.call.result': JSON.stringify({
            output: { update: { messages: [{ kwargs: { type: 'tool' } }] } },
          }),
        }),
      ]);

      expect(steps).toEqual([
        { tool_id: 'some_tool', arguments: { query: 'x' }, result: { rows: 2 } },
        {
          tool_id: 'some_tool',
          arguments: { inputs: null, input_str: 'raw' },
          result: 'plain text',
        },
        {
          tool_id: 'some_tool',
          result: { update: { messages: [{ kwargs: { type: 'tool' } }] } },
        },
      ]);
    });

    it('keeps the raw parsed envelope when parse mode is not set', async () => {
      const [span] = getToolSpans(LANGCHAIN_TRACES.mcpTool);

      const [step] = await normalizeSteps([span], baseMapping);

      expect(step.tool_call_id).toBeUndefined();
      expect(step.arguments).toEqual(
        expect.objectContaining({ input_str: '{}', inputs: {}, kwargs: expect.any(Object) })
      );
      expect(step.result).toEqual({
        output: expect.objectContaining({ lc: 1, type: 'constructor' }),
        kwargs: expect.any(Object),
      });
    });
  });

  describe('openllmetry-langchain auto-detect', () => {
    const OTHER_SCOPE = 'some.other.instrumentation';

    const resolveSourceField = (source: unknown, path: string): unknown => {
      if (source === null || typeof source !== 'object') {
        return undefined;
      }
      const record = source as Record<string, unknown>;
      if (path in record) {
        return record[path];
      }
      const segments = path.split('.');
      for (let index = 1; index < segments.length; index++) {
        const head = segments.slice(0, index).join('.');
        if (head in record) {
          return resolveSourceField(record[head], segments.slice(index).join('.'));
        }
      }
      return undefined;
    };

    interface SearchRequest {
      index: string;
      query: { bool: { filter: Array<{ term?: Record<string, unknown> }> } };
    }

    // Applies the term filters of each request to the given spans, like Elasticsearch would.
    const createSpanStore = (spans: Array<Record<string, unknown>>) => {
      const { esClient, searchMock } = createEsClient();
      searchMock.mockImplementation(({ index, query }: SearchRequest) => {
        if (index !== 'traces-*') {
          return Promise.resolve({ hits: { hits: [] } });
        }
        const terms = query.bool.filter
          .flatMap(({ term }) => (term ? Object.entries(term) : []))
          .filter(([field]) => field !== 'trace.id');
        const hits = spans
          .filter((span) =>
            terms.every(([field, value]) => resolveSourceField(span, field) === value)
          )
          .map((span) => ({ _source: span }));
        return Promise.resolve({ hits: { hits } });
      });
      return createTraceAccessor({ traceId, esClient });
    };

    const expectCleanSteps = (steps: ToolCallEvidence[]) => {
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(step.tool_call_id).toEqual(expect.any(String));
        expect(step.arguments).not.toEqual(expect.objectContaining({ kwargs: expect.anything() }));
        expect(step.arguments).not.toEqual(
          expect.objectContaining({ input_str: expect.anything() })
        );
        expect(JSON.stringify(step.result)).not.toContain('"lc":1');
      }
    };

    it.each([
      ['MCP tool', LANGCHAIN_TRACES.mcpTool, ['platform_core_list_indices']],
      [
        'read_file plus MCP calls',
        LANGCHAIN_TRACES.readFile,
        ['read_file', 'platform_core_list_indices', 'platform_core_get_index_mapping'],
      ],
      ['write_todos plus MCP', LANGCHAIN_TRACES.writeTodos, undefined],
      ['task plus sub-agent', LANGCHAIN_TRACES.subAgent, ['task', 'platform_core_list_indices']],
    ])(
      'selects openllmetry-langchain with clean steps for the %s trace',
      async (_label, fixtureTraceId, expectedToolIds) => {
        const traceAccessor = createSpanStore(getOpenllmetryLangchainSpans(fixtureTraceId));

        const { selected } = await extractSelectedEvidence(traceAccessor);

        expect(selected?.profile).toBe('openllmetry-langchain');
        expect(selected?.round.input.message).not.toBe('');
        expect(selected?.round.response.message).not.toBe('');
        const steps = selected?.round.steps ?? [];
        expectCleanSteps(steps);
        if (expectedToolIds) {
          expect(steps.map(({ tool_id: toolId }) => toolId)).toEqual(expectedToolIds);
        }
      }
    );

    it('keeps the main agent question and answer for the sub-agent trace', async () => {
      const traceAccessor = createSpanStore(
        getOpenllmetryLangchainSpans(LANGCHAIN_TRACES.subAgent)
      );

      const { selected } = await extractSelectedEvidence(traceAccessor);

      expect(selected?.round.input.message).toMatch(/^Use the task tool to de/);
      expect(selected?.round.response.message).toMatch(/^The sub-agent found/);
      expect(selected?.round.steps.map(({ tool_id: toolId }) => toolId)).toEqual([
        'task',
        'platform_core_list_indices',
      ]);
      expect(selected?.round.steps[0].tool_call_id).toBe('toolu_01JwRv5DeqrZnbKgW56FHiri');
      expect(selected?.round.steps[1].tool_call_id).toBe('toolu_01TtKmqUnNo2HkHhZ69pSBvB');
    });

    it('keeps otel-genai-attributes for GenAI spans from another scope', async () => {
      const spans = getOpenllmetryLangchainSpans(LANGCHAIN_TRACES.mcpTool).map((span) => ({
        ...span,
        scope: { name: OTHER_SCOPE },
      }));
      const traceAccessor = createSpanStore(spans);

      const { selected, profiles } = await extractSelectedEvidence(traceAccessor);

      expect(selected?.profile).toBe('otel-genai-attributes');
      expect(profiles?.find(({ profile }) => profile === 'openllmetry-langchain')).toEqual(
        expect.objectContaining({
          evidence: {
            user_query: expect.objectContaining({ status: 'not_found' }),
            agent_response: expect.objectContaining({ status: 'not_found' }),
            tool_calls: expect.objectContaining({ status: 'not_found' }),
          },
        })
      );
    });
  });
});

describe('hasRootSpan', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';

  const createEsClient = () => {
    const searchMock = jest.fn();
    const esClient = {
      search: searchMock,
    } as unknown as ElasticsearchClient;
    return { esClient, searchMock };
  };

  it('queries traces for a parent-less span scoped to the trace', async () => {
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });
    searchMock.mockResolvedValue({ hits: { hits: [{ _source: { '@timestamp': 'now' } }] } });

    await expect(hasRootSpan(traceAccessor)).resolves.toBe(true);

    const request = searchMock.mock.calls[0][0];
    const bool = (request.query as { bool?: { filter?: unknown[]; must_not?: unknown[] } }).bool;
    expect(bool?.filter).toEqual(expect.arrayContaining([{ term: { 'trace.id': traceId } }]));
    expect(bool?.must_not).toEqual([{ exists: { field: 'parent_span_id' } }]);
  });

  it('returns false when no parent-less span is indexed yet', async () => {
    const { esClient, searchMock } = createEsClient();
    const traceAccessor = createTraceAccessor({ traceId, esClient });
    searchMock.mockResolvedValue({ hits: { hits: [] } });

    await expect(hasRootSpan(traceAccessor)).resolves.toBe(false);
  });
});
