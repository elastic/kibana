/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { createLookupTool, type AccessGate } from './lookup';
import type { Access } from './sources';

const columns = [
  'id',
  'title',
  'content',
  '_score',
  'updated_at',
  'connector_id',
  'permission_scope',
  'mine',
  'document_id',
  'source',
  'source_modified',
  'summary_kind',
].map((name) => ({ name }));
const row = (id: string, scope: 'connector' | 'per_user', mine = false, kind = 'llm') => [
  id,
  `${id}.md`,
  `text of ${id}`,
  1.234,
  '2026-11-02T00:00:00Z',
  'drive-1',
  scope,
  mine,
  id,
  `https://x/${id}`,
  null,
  kind,
];

const run = async (
  rows: unknown[][],
  gateOver?: Partial<AccessGate> & { answers?: Record<string, Access> }
) => {
  const canOpen = jest.fn(
    async (_connector: string, fileId: string): Promise<Access> =>
      gateOver?.answers?.[fileId] ?? { decision: 'allowed' }
  );
  const setPrincipal = jest.fn().mockResolvedValue(undefined);
  const tool = createLookupTool({
    target: async () => 'ai-index-x',
    runQuery: async () => ({ columns, values: rows }),
    getProfileUid: async () => 'u_a',
    gate: () => ({ ttlMs: 60_000, maxChecks: 2, canOpen, setPrincipal, ...gateOver }),
  });
  const result = await tool.handler({ query: 'plan', limit: 4 }, {
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    logger: loggingSystemMock.createLogger(),
  } as never);
  const data = (result as unknown as { results: Array<{ data: Record<string, unknown> }> })
    .results[0].data;
  return {
    data,
    hits: data.hits as Array<{ title: string; names_only?: boolean }>,
    canOpen,
    setPrincipal,
  };
};

describe('lookup tool', () => {
  it('says so when nothing is cached yet', async () => {
    const tool = createLookupTool({
      target: async () => undefined,
      runQuery: jest.fn(),
      getProfileUid: async () => 'u_a',
    });

    const result = await tool.handler({ query: 'x', limit: 4 }, {
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
    } as never);

    expect(
      (result as unknown as { results: Array<{ data: { hits: unknown[] } }> }).results[0].data.hits
    ).toEqual([]);
  });

  it('returns files of a shared connector as they are, marking those cached by name only', async () => {
    const { hits, canOpen } = await run([
      row('a', 'connector'),
      row('b', 'connector', false, 'names'),
    ]);

    expect(hits.map((hit) => [hit.title, hit.names_only])).toEqual([
      ['a.md', undefined],
      ['b.md', true],
    ]);
    expect(canOpen).not.toHaveBeenCalled();
  });

  it('checks a per-user file live: shows it and adds the reader when allowed, hides it and removes them when denied', async () => {
    const { hits, setPrincipal, data } = await run(
      [row('mine', 'per_user', true), row('new', 'per_user', false), row('gone', 'per_user', true)],
      { maxChecks: 3, answers: { gone: { decision: 'denied' } } }
    );

    expect(hits.map((hit) => hit.title)).toEqual(['mine.md', 'new.md']);
    expect(setPrincipal.mock.calls).toEqual([
      ['new', 'add'],
      ['gone', 'remove'],
    ]);
    expect(data).toMatchObject({ denied_count: 1 });
  });

  it('leaves out a file it cannot verify, and files beyond the number of checks allowed, and says so', async () => {
    const { hits, data } = await run(
      [row('a', 'per_user', true), row('b', 'per_user', true), row('c', 'per_user', true)],
      { maxChecks: 2, answers: { a: { decision: 'unknown', reason: 'timed out' } } }
    );

    expect(hits.map((hit) => hit.title)).toEqual(['b.md']);
    expect(data).toMatchObject({
      pending_count: 2,
      pending_reasons: expect.arrayContaining(['timed out']),
    });
    expect(String(data.note)).toContain('could not be verified');
  });

  it('does not repeat a live check it already has the answer to', async () => {
    const { canOpen } = await run([row('a', 'per_user', true), row('a', 'per_user', true)]);

    expect(canOpen).toHaveBeenCalledTimes(1);
  });
});
