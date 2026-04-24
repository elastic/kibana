/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneratedSignificantEventQuery, QueryLink, Streams } from '@kbn/streams-schema';
import { persistQueries } from './persist_queries';
import type { QueryClient } from '../streams/assets/query/query_client';
import type { StreamsClient } from '../streams/client';

jest.mock('uuid', () => ({ v4: () => 'generated-uuid' }));

const definition = { name: 'logs.test' } as Streams.all.Definition;

const makeLink = (
  overrides: { id?: string; esql?: string; ruleBacked?: boolean } = {}
): QueryLink => ({
  'asset.uuid': `uuid-${overrides.id ?? 'q1'}`,
  'asset.type': 'query',
  'asset.id': overrides.id ?? 'q1',
  query: {
    id: overrides.id ?? 'q1',
    type: 'match',
    title: 'Test query',
    description: 'desc',
    esql: { query: overrides.esql ?? 'FROM logs | WHERE body.text:"error"' },
    severity_score: 60,
  },
  stream_name: 'logs.test',
  rule_backed: overrides.ruleBacked ?? false,
  rule_id: `rule-${overrides.id ?? 'q1'}`,
});

const makeGeneratedQuery = (
  overrides: Partial<GeneratedSignificantEventQuery> = {}
): GeneratedSignificantEventQuery => ({
  type: 'match',
  title: 'New query',
  description: 'desc',
  esql: { query: 'FROM logs | WHERE body.text:"timeout"' },
  severity_score: 50,
  ...overrides,
});

const createMocks = (existingLinks: QueryLink[] = []) => {
  const queryClient = {
    getStreamToQueryLinksMap: jest.fn().mockResolvedValue({ 'logs.test': existingLinks }),
    bulk: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<QueryClient>;

  const streamsClient = {
    getStream: jest.fn().mockResolvedValue(definition),
  } as unknown as jest.Mocked<StreamsClient>;

  return { queryClient, streamsClient };
};

describe('persistQueries', () => {
  it('does nothing when queries array is empty', async () => {
    const { queryClient, streamsClient } = createMocks();
    await persistQueries('logs.test', [], { queryClient, streamsClient });

    expect(streamsClient.getStream).not.toHaveBeenCalled();
    expect(queryClient.bulk).not.toHaveBeenCalled();
  });

  it('creates new queries with generated UUIDs via createRules: false', async () => {
    const { queryClient, streamsClient } = createMocks();
    const query = makeGeneratedQuery();

    await persistQueries('logs.test', [query], { queryClient, streamsClient });

    expect(queryClient.bulk).toHaveBeenCalledTimes(1);
    expect(queryClient.bulk).toHaveBeenCalledWith(
      definition,
      [
        expect.objectContaining({
          index: expect.objectContaining({ id: 'generated-uuid' }),
        }),
      ],
      { createRules: false }
    );
  });

  it('skips queries whose normalized ES|QL matches an existing stored query', async () => {
    const existing = makeLink({ id: 'q1', esql: 'FROM logs | WHERE body.text:"error"' });
    const { queryClient, streamsClient } = createMocks([existing]);

    const duplicate = makeGeneratedQuery({
      esql: { query: 'FROM  logs  |  WHERE  body.text:"error"' },
    });

    await persistQueries('logs.test', [duplicate], { queryClient, streamsClient });

    expect(queryClient.bulk).not.toHaveBeenCalled();
  });

  it('deduplicates within a single batch (intra-batch dedup)', async () => {
    const { queryClient, streamsClient } = createMocks();

    const q1 = makeGeneratedQuery({
      title: 'First',
      esql: { query: 'FROM logs | WHERE body.text:"timeout"' },
    });
    const q2 = makeGeneratedQuery({
      title: 'Second (duplicate)',
      esql: { query: 'FROM logs | WHERE body.text:"timeout"' },
    });

    await persistQueries('logs.test', [q1, q2], { queryClient, streamsClient });

    expect(queryClient.bulk).toHaveBeenCalledTimes(1);
    const ops = (queryClient.bulk as jest.Mock).mock.calls[0][1];
    expect(ops).toHaveLength(1);
    expect(ops[0].index.title).toBe('First');
  });

  it('deduplicates commutative AND reorderings against existing', async () => {
    const existing = makeLink({
      id: 'q1',
      esql: 'FROM logs | WHERE body.text:"timeout" AND body.text:"connection"',
    });
    const { queryClient, streamsClient } = createMocks([existing]);

    const reordered = makeGeneratedQuery({
      esql: { query: 'FROM logs | WHERE body.text:"connection" AND body.text:"timeout"' },
    });

    await persistQueries('logs.test', [reordered], { queryClient, streamsClient });

    expect(queryClient.bulk).not.toHaveBeenCalled();
  });

  it('routes replaces for non-rule-backed queries to standardOps with createRules: false', async () => {
    const existing = makeLink({ id: 'q1', ruleBacked: false });
    const { queryClient, streamsClient } = createMocks([existing]);

    const replacement = makeGeneratedQuery({
      replaces: 'q1',
      esql: { query: 'FROM logs | WHERE body.text:"new-error"' },
    });

    await persistQueries('logs.test', [replacement], { queryClient, streamsClient });

    expect(queryClient.bulk).toHaveBeenCalledTimes(1);
    expect(queryClient.bulk).toHaveBeenCalledWith(
      definition,
      [expect.objectContaining({ index: expect.objectContaining({ id: 'q1' }) })],
      { createRules: false }
    );
  });

  it('routes replaces for rule-backed queries to ruleBackedReplaceOps (no createRules option)', async () => {
    const existing = makeLink({ id: 'q1', ruleBacked: true });
    const { queryClient, streamsClient } = createMocks([existing]);

    const replacement = makeGeneratedQuery({
      replaces: 'q1',
      esql: { query: 'FROM logs | WHERE body.text:"updated-error"' },
    });

    await persistQueries('logs.test', [replacement], { queryClient, streamsClient });

    expect(queryClient.bulk).toHaveBeenCalledTimes(1);
    expect(queryClient.bulk).toHaveBeenCalledWith(definition, [
      expect.objectContaining({ index: expect.objectContaining({ id: 'q1' }) }),
    ]);
    expect((queryClient.bulk as jest.Mock).mock.calls[0][2]).toBeUndefined();
  });

  it('falls through to new query when replaces targets a nonexistent ID', async () => {
    const { queryClient, streamsClient } = createMocks();

    const query = makeGeneratedQuery({
      replaces: 'nonexistent-id',
      esql: { query: 'FROM logs | WHERE body.text:"fallback"' },
    });

    await persistQueries('logs.test', [query], { queryClient, streamsClient });

    expect(queryClient.bulk).toHaveBeenCalledTimes(1);
    const ops = (queryClient.bulk as jest.Mock).mock.calls[0][1];
    expect(ops[0].index.id).toBe('generated-uuid');
  });

  it('issues two bulk calls when both standard and rule-backed ops exist', async () => {
    const nonRuleBacked = makeLink({
      id: 'q1',
      esql: 'FROM logs | WHERE body.text:"old1"',
      ruleBacked: false,
    });
    const ruleBacked = makeLink({
      id: 'q2',
      esql: 'FROM logs | WHERE body.text:"old2"',
      ruleBacked: true,
    });
    const { queryClient, streamsClient } = createMocks([nonRuleBacked, ruleBacked]);

    const newQuery = makeGeneratedQuery({
      title: 'Brand new',
      esql: { query: 'FROM logs | WHERE body.text:"brand-new"' },
    });
    const replaceNonRuleBacked = makeGeneratedQuery({
      replaces: 'q1',
      esql: { query: 'FROM logs | WHERE body.text:"replaced1"' },
    });
    const replaceRuleBacked = makeGeneratedQuery({
      replaces: 'q2',
      esql: { query: 'FROM logs | WHERE body.text:"replaced2"' },
    });

    await persistQueries('logs.test', [newQuery, replaceNonRuleBacked, replaceRuleBacked], {
      queryClient,
      streamsClient,
    });

    expect(queryClient.bulk).toHaveBeenCalledTimes(2);

    const [firstCall, secondCall] = (queryClient.bulk as jest.Mock).mock.calls;
    expect(firstCall[2]).toEqual({ createRules: false });
    expect(firstCall[1]).toHaveLength(2);

    expect(secondCall[2]).toBeUndefined();
    expect(secondCall[1]).toHaveLength(1);
    expect(secondCall[1][0].index.id).toBe('q2');
  });

  it('skips replaces when the replacement ES|QL matches the existing query exactly', async () => {
    const existing = makeLink({
      id: 'q1',
      esql: 'FROM logs | WHERE body.text:"error"',
    });
    const { queryClient, streamsClient } = createMocks([existing]);

    const noOpReplace = makeGeneratedQuery({
      replaces: 'q1',
      esql: { query: 'FROM logs | WHERE body.text:"error"' },
    });

    await persistQueries('logs.test', [noOpReplace], { queryClient, streamsClient });

    expect(queryClient.bulk).not.toHaveBeenCalled();
  });
});
