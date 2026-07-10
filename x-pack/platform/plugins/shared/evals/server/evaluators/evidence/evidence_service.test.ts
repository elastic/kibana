/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { normalizeEvidence } from './evidence_service';
import { resolveEvidenceMapping } from './resolve_mapping';

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
    const mapping = resolveEvidenceMapping({ profile: 'elastic-inference' });
    const { esClient, searchMock } = createEsClient();

    // Mirrors the real `_source` shape returned by ES: a nested `attributes`
    // object whose keys are dotted (partially flattened OTLP attributes).
    searchMock
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.000Z',
                attributes: { content: 'What is the payment status?' },
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
                attributes: { 'message.content': 'Payment service is healthy.' },
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

    await expect(normalizeEvidence({ traceId, esClient }, mapping)).resolves.toEqual({
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

  it('resolves fields regardless of flattened, nested, or dotted-key document shape', async () => {
    const mapping = resolveEvidenceMapping({ profile: 'elastic-inference' });
    const { esClient, searchMock } = createEsClient();

    searchMock
      // fully flattened root key
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.000Z',
                'attributes.content': 'flattened question',
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
                attributes: { message: { content: 'nested answer' } },
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

    await expect(normalizeEvidence({ traceId, esClient }, mapping)).resolves.toEqual({
      input: { message: 'flattened question' },
      response: { message: 'nested answer' },
      steps: [{ tool_call_id: 'call-1', tool_id: 'health_check' }],
    });
  });

  it('normalizes otel-genai-attributes chat span messages', async () => {
    const mapping = resolveEvidenceMapping({ profile: 'otel-genai-attributes' });
    const { esClient, searchMock } = createEsClient();

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

    await expect(normalizeEvidence({ traceId, esClient }, mapping)).resolves.toEqual({
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

  it('maps a bare agentBuilder.tool run to arguments (question) and result (answer)', async () => {
    const mapping = resolveEvidenceMapping({ profile: 'agent-builder-tool' });
    const { esClient, searchMock } = createEsClient();

    // A bare tool run has a single `execute_tool` span and no conversation, so
    // user_query, agent_response, and tool_calls all resolve from that same span.
    const toolSpan = {
      _source: {
        '@timestamp': '2026-06-26T10:00:00.000Z',
        attributes: {
          'elastic.inference.span.kind': 'TOOL',
          'gen_ai.tool.call.id': 'call-1',
          'gen_ai.tool.name': 'generate_esql',
          'gen_ai.tool.call.arguments': '{"query":"errors by service"}',
          'gen_ai.tool.call.result': '{"esql":"FROM logs | STATS count() BY service"}',
        },
      },
    };

    searchMock
      .mockResolvedValueOnce({ hits: { hits: [toolSpan] } })
      .mockResolvedValueOnce({ hits: { hits: [toolSpan] } })
      .mockResolvedValueOnce({ hits: { hits: [toolSpan] } });

    await expect(normalizeEvidence({ traceId, esClient }, mapping)).resolves.toEqual({
      input: { message: '{"query":"errors by service"}' },
      response: { message: '{"esql":"FROM logs | STATS count() BY service"}' },
      steps: [
        {
          tool_call_id: 'call-1',
          tool_id: 'generate_esql',
          arguments: { query: 'errors by service' },
          result: { esql: 'FROM logs | STATS count() BY service' },
        },
      ],
    });
  });
});
