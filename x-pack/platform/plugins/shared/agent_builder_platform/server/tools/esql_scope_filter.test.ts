/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { mergeScopeClauses, resolveEsqlScopeFilter } from './esql_scope_filter';

const SML_INDEX = 'ai-index-idx-sml-data';

const spaceClauseFor = (spaceId: string): QueryDslQueryContainer => ({
  bool: {
    minimum_should_match: 1,
    should: [
      { terms: { spaces: [spaceId, '*'] } },
      { bool: { must_not: { exists: { field: 'spaces' } } } },
    ],
  },
});

const keywordField = {
  spaces: { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
};

describe('mergeScopeClauses', () => {
  it('returns undefined when there are no clauses', () => {
    expect(mergeScopeClauses([])).toBeUndefined();
  });

  it('returns the clause itself when there is exactly one', () => {
    const clause = { term: { spaces: 'marketing' } };

    expect(mergeScopeClauses([clause])).toBe(clause);
  });

  it('ANDs the clauses under bool.must when there are several', () => {
    const first = { term: { spaces: 'marketing' } };
    const second = { term: { type: 'dashboard' } };

    expect(mergeScopeClauses([first, second])).toEqual({ bool: { must: [first, second] } });
  });
});

describe('resolveEsqlScopeFilter', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  /** Stub one `field_caps` response: which concrete indices resolved, and whether they map `spaces`. */
  const mockProbe = (indices: string[], spacesMapped: boolean) =>
    esClient.fieldCaps.mockResolvedValue({
      indices,
      fields: spacesMapped ? keywordField : {},
    } as never);

  /** Resolve and assert success, returning the filter (which may be undefined). */
  const resolve = async (query: string, spaceId = 'marketing') => {
    const result = await resolveEsqlScopeFilter({ query, spaceId, esClient, logger });

    if (!result.ok) {
      throw new Error(`expected a scope filter but the query was refused: ${result.error}`);
    }
    return result.filter;
  };

  /** Resolve and assert refusal, returning the message the tool surfaces to the model. */
  const resolveRefusal = async (query: string, spaceId = 'marketing') => {
    const result = await resolveEsqlScopeFilter({ query, spaceId, esClient, logger });

    if (result.ok) {
      throw new Error('expected the query to be refused, but it resolved');
    }
    return result.error;
  };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
  });

  describe('when the query targets AI indices', () => {
    it('scopes to the current space', async () => {
      mockProbe([SML_INDEX], true);

      expect(await resolve('FROM ai-index-* | LIMIT 10')).toEqual(spaceClauseFor('marketing'));
    });

    it('scopes the default space the same way as a named space', async () => {
      mockProbe([SML_INDEX], true);

      expect(await resolve('FROM ai-index-*', 'default')).toEqual(spaceClauseFor('default'));
    });

    it('lets documents with no spaces field through, so AI indices without the mapping survive field resolution', async () => {
      mockProbe([SML_INDEX, 'ai-index-other'], true);

      const filter = await resolve('FROM ai-index-*');

      expect(filter?.bool?.should).toContainEqual({
        bool: { must_not: { exists: { field: 'spaces' } } },
      });
    });

    it('sends no filter when the AI indices do not map the spaces field', async () => {
      mockProbe(['ai-index-other'], false);

      expect(await resolve('FROM ai-index-other')).toBeUndefined();
    });

    it('recognises a rolled-over write index behind an alias', async () => {
      mockProbe([`${SML_INDEX}-000001`], true);

      expect(await resolve(`FROM ${SML_INDEX}`)).toEqual(spaceClauseFor('marketing'));
    });

    it('recognises a data stream backing index', async () => {
      mockProbe(['.ds-ai-index-ds-events-2026.08.07-000001'], true);

      expect(await resolve('FROM ai-index-ds-events')).toEqual(spaceClauseFor('marketing'));
    });

    it('recognises a remote index under cross-cluster search', async () => {
      mockProbe([`remote:${SML_INDEX}`], true);

      expect(await resolve(`FROM remote:${SML_INDEX}`)).toEqual(spaceClauseFor('marketing'));
    });
  });

  describe('when the query targets no AI index', () => {
    it('sends no filter for an ordinary index', async () => {
      mockProbe(['logs-000001'], false);

      expect(await resolve('FROM logs-* | LIMIT 10')).toBeUndefined();
    });

    it('sends no filter for an unrelated index that happens to map a spaces field', async () => {
      // `spaces` is an ordinary word. Filtering a meeting-room index by Kibana space ids would
      // silently drop the caller's rows, so the namespace gate has to win over the field probe.
      mockProbe(['meeting-rooms'], true);

      expect(await resolve('FROM meeting-rooms')).toBeUndefined();
    });

    it('sends no filter when the pattern matches nothing at all', async () => {
      mockProbe([], false);

      expect(await resolve('FROM does-not-exist-*')).toBeUndefined();
    });

    it('returns no filter for a query with no source command', async () => {
      expect(await resolve('ROW a = 1')).toBeUndefined();
      expect(esClient.fieldCaps).not.toHaveBeenCalled();
    });
  });

  describe('when the query mixes AI indices with other indices', () => {
    it('fails closed rather than scoping or skipping', async () => {
      mockProbe([SML_INDEX, 'logs-000001'], true);

      await expect(resolveRefusal('FROM ai-index-*,logs-*')).resolves.toMatch(
        /reads from AI indices .* and from other indices .* query them separately/s
      );
    });

    it('names both sides so the caller can split the query', async () => {
      mockProbe([SML_INDEX, 'logs-000001'], true);

      await expect(resolveRefusal('FROM ai-index-*,logs-*')).resolves.toMatch(
        new RegExp(`${SML_INDEX}[\\s\\S]*logs-000001`)
      );
    });

    it('catches a broad wildcard that happens to span both', async () => {
      mockProbe(['logs-000001', SML_INDEX, 'metrics-000001'], true);

      await expect(resolveRefusal('FROM *')).resolves.toMatch(/cannot be scoped together/);
    });
  });

  describe('field probe', () => {
    it('probes only the scoped fields, tolerating missing indices', async () => {
      mockProbe([SML_INDEX], true);

      await resolve('FROM ai-index-* | LIMIT 10');

      expect(esClient.fieldCaps).toHaveBeenCalledTimes(1);
      expect(esClient.fieldCaps).toHaveBeenCalledWith({
        index: 'ai-index-*',
        fields: ['spaces'],
        ignore_unavailable: true,
        allow_no_indices: true,
      });
    });

    it('probes every source of a multi-source query in one call', async () => {
      mockProbe([SML_INDEX], true);

      await resolve('FROM ai-index-*, remote:ai-index-*');

      expect(esClient.fieldCaps).toHaveBeenCalledTimes(1);
      expect(esClient.fieldCaps).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'ai-index-*,remote:ai-index-*' })
      );
    });

    it('strips the quoting ES|QL allows around a source name', async () => {
      mockProbe([SML_INDEX], true);

      await resolve('FROM "ai-index-*"');

      expect(esClient.fieldCaps).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'ai-index-*' })
      );
    });

    it('fails closed when the probe errors, rather than dropping the space scope', async () => {
      esClient.fieldCaps.mockRejectedValue(new Error('cluster_block_exception'));

      await expect(resolveRefusal('FROM ai-index-*')).resolves.toMatch(
        /Could not determine the space scope/
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failing closed'));
    });
  });
});
