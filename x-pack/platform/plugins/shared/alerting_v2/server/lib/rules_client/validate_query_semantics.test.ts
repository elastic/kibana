/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { Query } from '@kbn/alerting-v2-schemas';
import { collectQuerySemanticErrors, validateQuerySemantics } from './validate_query_semantics';

const buildEsClient = () => elasticsearchServiceMock.createElasticsearchClient();

describe('validate_query_semantics', () => {
  describe('collectQuerySemanticErrors', () => {
    it('submits the standalone breach query with "| LIMIT 0" appended', async () => {
      const esClient = buildEsClient();
      esClient.esql.query.mockResolvedValue({} as never);

      const query: Query = {
        format: 'standalone',
        breach: { query: 'FROM logs-* | STATS errors = COUNT(*) BY host' },
      };

      const errors = await collectQuerySemanticErrors({ esClient, query });

      expect(errors).toEqual([]);
      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
      expect(esClient.esql.query).toHaveBeenCalledWith(
        {
          query: 'FROM logs-* | STATS errors = COUNT(*) BY host | LIMIT 0',
          format: 'json',
        },
        expect.any(Object)
      );
    });

    it('composes the breach segment with base before validation', async () => {
      const esClient = buildEsClient();
      esClient.esql.query.mockResolvedValue({} as never);

      const query: Query = {
        format: 'composed',
        base: 'FROM metrics-* | STATS cpu = AVG(cpu) BY host',
        breach: { segment: 'WHERE cpu > 0.9' },
      };

      const errors = await collectQuerySemanticErrors({ esClient, query });

      expect(errors).toEqual([]);
      expect(esClient.esql.query).toHaveBeenCalledWith(
        {
          query: 'FROM metrics-* | STATS cpu = AVG(cpu) BY host | WHERE cpu > 0.9 | LIMIT 0',
          format: 'json',
        },
        expect.any(Object)
      );
    });

    it('validates breach, recovery (strategy "query"), and no_data blocks for standalone', async () => {
      const esClient = buildEsClient();
      esClient.esql.query.mockResolvedValue({} as never);

      const query: Query = {
        format: 'standalone',
        breach: { query: 'FROM logs-* | WHERE level == "error"' },
        recovery: { strategy: 'query', query: 'FROM logs-* | WHERE level == "info"' },
        no_data: { query: 'FROM logs-* | WHERE host IS NULL', behavior: 'emit' },
      };

      const errors = await collectQuerySemanticErrors({ esClient, query });

      expect(errors).toEqual([]);
      const calls = esClient.esql.query.mock.calls.map(([args]) => args.query);
      expect(calls).toEqual([
        'FROM logs-* | WHERE level == "error" | LIMIT 0',
        'FROM logs-* | WHERE level == "info" | LIMIT 0',
        'FROM logs-* | WHERE host IS NULL | LIMIT 0',
      ]);
    });

    it('validates breach, recovery, and no_data blocks for composed', async () => {
      const esClient = buildEsClient();
      esClient.esql.query.mockResolvedValue({} as never);

      const query: Query = {
        format: 'composed',
        base: 'FROM metrics-* | STATS errors = COUNT(*) BY host',
        breach: { segment: 'WHERE errors > 10' },
        recovery: { strategy: 'query', segment: 'WHERE errors == 0' },
        no_data: { segment: 'WHERE host IS NULL', behavior: 'last_status' },
      };

      const errors = await collectQuerySemanticErrors({ esClient, query });

      expect(errors).toEqual([]);
      const calls = esClient.esql.query.mock.calls.map(([args]) => args.query);
      expect(calls).toEqual([
        'FROM metrics-* | STATS errors = COUNT(*) BY host | WHERE errors > 10 | LIMIT 0',
        'FROM metrics-* | STATS errors = COUNT(*) BY host | WHERE errors == 0 | LIMIT 0',
        'FROM metrics-* | STATS errors = COUNT(*) BY host | WHERE host IS NULL | LIMIT 0',
      ]);
    });

    it('skips the recovery block when recovery is absent', async () => {
      const esClient = buildEsClient();
      esClient.esql.query.mockResolvedValue({} as never);

      const query: Query = {
        format: 'standalone',
        breach: { query: 'FROM logs-* | LIMIT 1' },
      };

      await collectQuerySemanticErrors({ esClient, query });

      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    });

    it('skips the recovery block when strategy is "no_breach"', async () => {
      const esClient = buildEsClient();
      esClient.esql.query.mockResolvedValue({} as never);

      const query: Query = {
        format: 'standalone',
        breach: { query: 'FROM logs-* | LIMIT 1' },
        recovery: { strategy: 'no_breach' },
      };

      await collectQuerySemanticErrors({ esClient, query });

      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    });

    it('reports an error with the standalone breach.query path on ES failure', async () => {
      const esClient = buildEsClient();
      esClient.esql.query.mockRejectedValueOnce(new Error('Column [errors] cannot be resolved'));

      const query: Query = {
        format: 'standalone',
        breach: { query: 'FROM logs-* | WHERE errors > 10' },
      };

      const errors = await collectQuerySemanticErrors({ esClient, query });

      expect(errors).toEqual([
        {
          path: 'query.breach.query',
          message: 'Column [errors] cannot be resolved',
        },
      ]);
    });

    it('reports an error with the composed breach.segment path on ES failure', async () => {
      const esClient = buildEsClient();
      esClient.esql.query.mockRejectedValueOnce(new Error('Column [errors] cannot be resolved'));

      const query: Query = {
        format: 'composed',
        base: 'FROM metrics-* | STATS cpu = AVG(cpu) BY host',
        breach: { segment: 'WHERE errors > 10' },
      };

      const errors = await collectQuerySemanticErrors({ esClient, query });

      expect(errors).toEqual([
        {
          path: 'query.breach.segment',
          message: 'Column [errors] cannot be resolved',
        },
      ]);
    });

    it('collects per-block errors when multiple blocks fail', async () => {
      const esClient = buildEsClient();
      esClient.esql.query
        .mockResolvedValueOnce({} as never)
        .mockRejectedValueOnce(new Error('recovery is bad'))
        .mockRejectedValueOnce(new Error('no_data is bad'));

      const query: Query = {
        format: 'composed',
        base: 'FROM metrics-* | STATS cpu = AVG(cpu) BY host',
        breach: { segment: 'WHERE cpu > 0.9' },
        recovery: { strategy: 'query', segment: 'WHERE foo' },
        no_data: { segment: 'WHERE bar', behavior: 'emit' },
      };

      const errors = await collectQuerySemanticErrors({ esClient, query });

      expect(errors).toEqual([
        { path: 'query.recovery.segment', message: 'recovery is bad' },
        { path: 'query.no_data.segment', message: 'no_data is bad' },
      ]);
    });
  });

  describe('validateQuerySemantics', () => {
    it('resolves without throwing when every block validates', async () => {
      const esClient = buildEsClient();
      esClient.esql.query.mockResolvedValue({} as never);

      await expect(
        validateQuerySemantics({
          esClient,
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 1' },
          },
        })
      ).resolves.toBeUndefined();
    });

    it('throws a 400 Boom error keyed to the failing block path', async () => {
      const esClient = buildEsClient();
      esClient.esql.query.mockRejectedValueOnce(new Error('Column [errors] cannot be resolved'));

      const query: Query = {
        format: 'composed',
        base: 'FROM metrics-* | STATS cpu = AVG(cpu) BY host',
        breach: { segment: 'WHERE errors > 10' },
      };

      await expect(validateQuerySemantics({ esClient, query })).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('query.breach.segment'),
      });
    });

    it('includes "(and N more)" in the message when multiple blocks fail', async () => {
      const esClient = buildEsClient();
      esClient.esql.query
        .mockRejectedValueOnce(new Error('breach is bad'))
        .mockRejectedValueOnce(new Error('recovery is bad'));

      const query: Query = {
        format: 'standalone',
        breach: { query: 'FROM logs-* | WHERE foo' },
        recovery: { strategy: 'query', query: 'FROM logs-* | WHERE bar' },
      };

      await expect(validateQuerySemantics({ esClient, query })).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('(and 1 more)'),
      });
    });

    it('attaches structured per-block errors as Boom data', async () => {
      const esClient = buildEsClient();
      esClient.esql.query
        .mockRejectedValueOnce(new Error('breach is bad'))
        .mockRejectedValueOnce(new Error('recovery is bad'));

      const query: Query = {
        format: 'standalone',
        breach: { query: 'FROM logs-* | WHERE foo' },
        recovery: { strategy: 'query', query: 'FROM logs-* | WHERE bar' },
      };

      await expect(validateQuerySemantics({ esClient, query })).rejects.toMatchObject({
        data: {
          type: 'EsqlSemanticValidationError',
          errors: [
            { path: 'query.breach.query', message: 'breach is bad' },
            { path: 'query.recovery.query', message: 'recovery is bad' },
          ],
        },
      });
    });
  });
});
