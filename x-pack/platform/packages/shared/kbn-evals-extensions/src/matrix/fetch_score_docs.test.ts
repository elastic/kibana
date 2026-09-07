/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchScoreDocs } from './fetch_score_docs';

describe('fetchScoreDocs', () => {
  const esUrl = 'https://es.example.com';
  const apiKey = 'key';
  const okResponse = (hits: unknown[]) => ({
    ok: true,
    json: async () => ({ hits: { hits } }),
  });

  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(okResponse([]));
    global.fetch = fetchMock as unknown as typeof global.fetch;
  });

  const body = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body);

  it('refuses an unscoped read rather than scanning every archived run', async () => {
    // 25 config model ids match 136 executions on the golden cluster: an
    // unscoped query is ~56 minutes of transfer and never what the caller meant.
    await expect(
      fetchScoreDocs({ esUrl, apiKey, exampleIds: ['a'], suiteIds: ['s'] })
    ).rejects.toThrow(/requires --execution-id or --models/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts an execution scope', async () => {
    await fetchScoreDocs({ esUrl, apiKey, exampleIds: ['a'], executionIds: ['e1'] });

    expect(body(0).query.bool.filter).toContainEqual({
      terms: { 'metadata.execution_id': ['e1'] },
    });
  });

  it('falls back to the config model list when no explicit models are given', async () => {
    await fetchScoreDocs({ esUrl, apiKey, exampleIds: ['a'], configModelIds: ['m1'] });

    expect(body(0).query.bool.filter).toContainEqual({ terms: { 'task.model.id': ['m1'] } });
  });

  it('prefers explicit models over the config list', async () => {
    await fetchScoreDocs({
      esUrl,
      apiKey,
      exampleIds: ['a'],
      modelIds: ['chosen'],
      configModelIds: ['ignored'],
    });

    expect(body(0).query.bool.filter).toContainEqual({ terms: { 'task.model.id': ['chosen'] } });
  });

  it('collapses to one document per execution', async () => {
    // A trajectory is stored once per evaluator (~15 docs); collapsing is what
    // turns a 42k-document read into a ~2.8k-trajectory read.
    await fetchScoreDocs({ esUrl, apiKey, exampleIds: ['a'], executionIds: ['e1'] });

    expect(body(0).collapse).toEqual({ field: 'metadata.execution_id' });
  });

  it('queries once per example and returns every hit', async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse([{ _source: { example: { id: 'a' } } }]))
      .mockResolvedValueOnce(okResponse([{ _source: { example: { id: 'b' } } }]));

    const docs = await fetchScoreDocs({
      esUrl,
      apiKey,
      exampleIds: ['a', 'b'],
      executionIds: ['e1'],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(docs).toHaveLength(2);
  });

  it('applies the as-of cutoff so replays match the published selection', async () => {
    await fetchScoreDocs({
      esUrl,
      apiKey,
      exampleIds: ['a'],
      executionIds: ['e1'],
      asOf: Date.parse('2026-09-01T00:00:00.000Z'),
    });

    expect(body(0).query.bool.filter).toContainEqual({
      range: { '@timestamp': { lt: '2026-09-01T00:00:00.000Z' } },
    });
  });

  it('surfaces a failed query instead of returning an empty result', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, text: async () => 'forbidden' });

    await expect(
      fetchScoreDocs({ esUrl, apiKey, exampleIds: ['a'], executionIds: ['e1'] })
    ).rejects.toThrow(/403 forbidden/);
  });
});
