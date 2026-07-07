/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { extractToolEvidence } from './tool_evidence';

describe('extractToolEvidence', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';

  const createEsClient = () => {
    const searchMock = jest.fn();
    const esClient = { search: searchMock } as unknown as ElasticsearchClient;
    return { esClient, searchMock };
  };

  const rootSpanHit = (attributes: Record<string, unknown>) => ({
    hits: { hits: [{ _source: { attributes } }] },
  });
  const toolRootHit = (args: string, result: string) =>
    rootSpanHit({
      'elastic.inference.span.kind': 'TOOL',
      'gen_ai.tool.call.arguments': args,
      'gen_ai.tool.call.result': result,
    });
  const emptyHits = { hits: { hits: [] } };

  it('maps the root tool span input to user_query and output to agent_response from _source', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValueOnce(
      toolRootHit('{"query":"errors in the last hour"}', '{"esql":"FROM logs"}')
    );

    await expect(extractToolEvidence({ traceId, esClient })).resolves.toEqual({
      user_query: '{"query":"errors in the last hour"}',
      agent_response: '{"esql":"FROM logs"}',
    });
  });

  it('queries the root span (no parent) in traces-* filtered by trace_id', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValueOnce(toolRootHit('{"query":"x"}', '{"esql":"FROM logs"}'));

    await extractToolEvidence({ traceId, esClient });

    const rootSearch = searchMock.mock.calls[0][0];
    expect(rootSearch.index).toBe('traces-*');
    expect(rootSearch.sort).toEqual([{ '@timestamp': { order: 'asc' } }]);
    expect(rootSearch.query.bool.filter).toContainEqual({ term: { trace_id: traceId } });
    expect(rootSearch.query.bool.must_not).toEqual([{ exists: { field: 'parent_span_id' } }]);
  });

  it('returns null when the root span is not a tool (a conversation/agent trace)', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValueOnce(rootSpanHit({ 'elastic.inference.span.kind': 'CHAIN' }));

    await expect(extractToolEvidence({ traceId, esClient })).resolves.toBeNull();
  });

  it('returns null when the trace has no spans yet', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValueOnce(emptyHits);

    await expect(extractToolEvidence({ traceId, esClient })).resolves.toBeNull();
  });

  it('returns empty strings when the root tool span lacks argument/result attributes', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValueOnce(rootSpanHit({ 'elastic.inference.span.kind': 'TOOL' }));

    await expect(extractToolEvidence({ traceId, esClient })).resolves.toEqual({
      user_query: '',
      agent_response: '',
    });
  });

  it('rethrows search errors unchanged', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockRejectedValueOnce(new Error('connection refused'));

    await expect(extractToolEvidence({ traceId, esClient })).rejects.toThrow('connection refused');
  });

  it('rejects an invalid trace id without querying', async () => {
    const { esClient, searchMock } = createEsClient();

    await expect(extractToolEvidence({ traceId: 'not-a-trace', esClient })).rejects.toThrow(
      /Invalid trace_id/
    );
    expect(searchMock).not.toHaveBeenCalled();
  });
});
