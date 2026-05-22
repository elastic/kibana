/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneratedSignificantEventQuery, QueryLink, Streams } from '@kbn/streams-schema';
import { QUERY_TYPE_MATCH, QUERY_TYPE_STATS } from '@kbn/streams-schema';
import { persistQueries } from './persist_queries';
import type { KnowledgeIndicatorClient } from '../streams/ki';
import type { StreamsClient } from '../streams/client';

const mockUuid = jest.fn();

jest.mock('uuid', () => ({ v4: () => mockUuid() }));

const definition = { name: 'logs.test' } as Streams.all.Definition;

const makeLink = (
  overrides: { id?: string; esql?: string; ruleBacked?: boolean } = {}
): QueryLink => ({
  query: {
    id: overrides.id ?? 'q1',
    type: QUERY_TYPE_MATCH,
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
  type: QUERY_TYPE_MATCH,
  title: 'New query',
  description: 'desc',
  esql: { query: 'FROM logs | WHERE body.text:"timeout"' },
  severity_score: 50,
  features: [{ id: 'test-feature', run_id: 'test-run' }],
  ...overrides,
});

const createMocks = (existingLinks: QueryLink[] = []) => {
  const kiClient = {
    getStreamToQueryLinksMap: jest.fn().mockResolvedValue({ 'logs.test': existingLinks }),
    bulk: jest.fn().mockResolvedValue({ applied: 1, skipped: 0 }),
    syncQueries: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<KnowledgeIndicatorClient>;

  const streamsClient = {
    getStream: jest.fn().mockResolvedValue(definition),
  } as unknown as jest.Mocked<StreamsClient>;

  return { kiClient, streamsClient };
};

describe('persistQueries', () => {
  beforeEach(() => {
    mockUuid.mockReset();
    mockUuid.mockReturnValue('generated-uuid');
  });

  it('does nothing when queries array is empty', async () => {
    const { kiClient, streamsClient } = createMocks();

    await persistQueries('logs.test', [], { kiClient, streamsClient });

    expect(streamsClient.getStream).not.toHaveBeenCalled();
    expect(kiClient.bulk).not.toHaveBeenCalled();
    expect(kiClient.syncQueries).not.toHaveBeenCalled();
  });

  it('creates low-severity queries as unbacked append-only revisions', async () => {
    const { kiClient, streamsClient } = createMocks();
    const query = makeGeneratedQuery();

    await persistQueries('logs.test', [query], { kiClient, streamsClient });

    expect(kiClient.syncQueries).not.toHaveBeenCalled();
    expect(kiClient.bulk).toHaveBeenCalledWith('logs.test', [
      {
        index: {
          query: expect.objectContaining({
            id: 'generated-uuid',
            type: QUERY_TYPE_MATCH,
            title: 'New query',
          }),
        },
      },
    ]);
  });

  it('skips queries whose normalized ES|QL matches an existing stored query', async () => {
    const existing = makeLink({ id: 'q1', esql: 'FROM logs | WHERE body.text:"error"' });
    const { kiClient, streamsClient } = createMocks([existing]);
    const duplicate = makeGeneratedQuery({
      esql: { query: 'FROM  logs  |  WHERE  body.text:"error"' },
    });

    const result = await persistQueries('logs.test', [duplicate], { kiClient, streamsClient });

    expect(result.persistedQueries).toEqual([]);
    expect(result.skippedQueries).toEqual([duplicate]);
    expect(kiClient.bulk).not.toHaveBeenCalled();
    expect(kiClient.syncQueries).not.toHaveBeenCalled();
  });

  it('deduplicates within a single batch', async () => {
    const { kiClient, streamsClient } = createMocks();
    const first = makeGeneratedQuery({
      title: 'First',
      esql: { query: 'FROM logs | WHERE body.text:"timeout"' },
    });
    const duplicate = makeGeneratedQuery({
      title: 'Second duplicate',
      esql: { query: 'FROM logs | WHERE body.text:"timeout"' },
    });

    await persistQueries('logs.test', [first, duplicate], { kiClient, streamsClient });

    expect(kiClient.bulk).toHaveBeenCalledTimes(1);
    expect(kiClient.bulk).toHaveBeenCalledWith('logs.test', [
      { index: { query: expect.objectContaining({ title: 'First' }) } },
    ]);
  });

  it('deduplicates commutative AND reorderings against existing queries', async () => {
    const existing = makeLink({
      id: 'q1',
      esql: 'FROM logs | WHERE body.text:"timeout" AND body.text:"connection"',
    });
    const { kiClient, streamsClient } = createMocks([existing]);
    const reordered = makeGeneratedQuery({
      esql: { query: 'FROM logs | WHERE body.text:"connection" AND body.text:"timeout"' },
    });

    await persistQueries('logs.test', [reordered], { kiClient, streamsClient });

    expect(kiClient.bulk).not.toHaveBeenCalled();
    expect(kiClient.syncQueries).not.toHaveBeenCalled();
  });

  it('routes replacements for unbacked queries through standard append-only writes', async () => {
    const existing = makeLink({ id: 'q1', ruleBacked: false });
    const { kiClient, streamsClient } = createMocks([existing]);
    const replacement = makeGeneratedQuery({
      replaces: 'q1',
      esql: { query: 'FROM logs | WHERE body.text:"new-error"' },
    });

    await persistQueries('logs.test', [replacement], { kiClient, streamsClient });

    expect(kiClient.syncQueries).not.toHaveBeenCalled();
    expect(kiClient.bulk).toHaveBeenCalledWith('logs.test', [
      { index: { query: expect.objectContaining({ id: 'q1' }) } },
    ]);
  });

  it('routes replacements for rule-backed queries through syncQueries', async () => {
    const existing = makeLink({ id: 'q1', ruleBacked: true });
    const { kiClient, streamsClient } = createMocks([existing]);
    const replacement = makeGeneratedQuery({
      replaces: 'q1',
      esql: { query: 'FROM logs | WHERE body.text:"updated-error"' },
    });

    await persistQueries('logs.test', [replacement], { kiClient, streamsClient });

    expect(kiClient.bulk).not.toHaveBeenCalled();
    expect(kiClient.syncQueries).toHaveBeenCalledWith(
      definition,
      [expect.objectContaining({ id: 'q1', esql: replacement.esql })],
      { currentLinks: [existing] }
    );
    // getStreamToQueryLinksMap is called once by persistQueries; syncQueries
    // must not re-read it (currentLinks passed through).
    expect(kiClient.getStreamToQueryLinksMap).toHaveBeenCalledTimes(1);
  });

  it('creates backing rules for high-severity non-STATS queries', async () => {
    const { kiClient, streamsClient } = createMocks();
    const query = makeGeneratedQuery({ severity_score: 75 });

    await persistQueries('logs.test', [query], { kiClient, streamsClient });

    expect(kiClient.bulk).not.toHaveBeenCalled();
    expect(kiClient.syncQueries).toHaveBeenCalledWith(
      definition,
      [expect.objectContaining({ id: 'generated-uuid', type: QUERY_TYPE_MATCH })],
      { currentLinks: [] }
    );
    expect(kiClient.getStreamToQueryLinksMap).toHaveBeenCalledTimes(1);
  });

  it('does not create backing rules for high-severity STATS queries', async () => {
    const { kiClient, streamsClient } = createMocks();
    const query = makeGeneratedQuery({
      type: QUERY_TYPE_STATS,
      severity_score: 90,
      esql: { query: 'FROM logs | STATS events = COUNT()' },
    });

    await persistQueries('logs.test', [query], { kiClient, streamsClient });

    expect(kiClient.syncQueries).not.toHaveBeenCalled();
    expect(kiClient.bulk).toHaveBeenCalledWith('logs.test', [
      {
        index: { query: expect.objectContaining({ id: 'generated-uuid', type: QUERY_TYPE_STATS }) },
      },
    ]);
  });

  it('derives rule eligibility from ES|QL instead of trusting generated type', async () => {
    const { kiClient, streamsClient } = createMocks();
    const query = makeGeneratedQuery({
      type: QUERY_TYPE_STATS,
      severity_score: 90,
      esql: { query: 'FROM logs | WHERE body.text:"critical"' },
    });

    await persistQueries('logs.test', [query], { kiClient, streamsClient });

    expect(kiClient.bulk).not.toHaveBeenCalled();
    expect(kiClient.syncQueries).toHaveBeenCalledWith(
      definition,
      [expect.objectContaining({ id: 'generated-uuid', type: QUERY_TYPE_MATCH })],
      { currentLinks: [] }
    );
  });

  it('syncs rule-backed changes before appending standard writes in mixed batches', async () => {
    mockUuid.mockReturnValueOnce('low-id').mockReturnValueOnce('high-id');
    const existingRuleBacked = makeLink({
      id: 'q1',
      esql: 'FROM logs | WHERE body.text:"old"',
      ruleBacked: true,
    });
    const { kiClient, streamsClient } = createMocks([existingRuleBacked]);
    const lowSeverity = makeGeneratedQuery({
      title: 'Low severity',
      severity_score: 30,
      esql: { query: 'FROM logs | WHERE body.text:"low"' },
    });
    const highSeverity = makeGeneratedQuery({
      title: 'High severity',
      severity_score: 80,
      esql: { query: 'FROM logs | WHERE body.text:"high"' },
    });
    const replacement = makeGeneratedQuery({
      replaces: 'q1',
      esql: { query: 'FROM logs | WHERE body.text:"replaced"' },
    });

    await persistQueries('logs.test', [lowSeverity, highSeverity, replacement], {
      kiClient,
      streamsClient,
    });

    expect(kiClient.syncQueries).toHaveBeenCalledWith(
      definition,
      [expect.objectContaining({ id: 'q1' }), expect.objectContaining({ id: 'high-id' })],
      { currentLinks: [existingRuleBacked] }
    );
    expect(kiClient.bulk).toHaveBeenCalledWith('logs.test', [
      { index: { query: expect.objectContaining({ id: 'low-id' }) } },
    ]);
    expect(kiClient.syncQueries.mock.invocationCallOrder[0]).toBeLessThan(
      kiClient.bulk.mock.invocationCallOrder[0]
    );
  });
});
