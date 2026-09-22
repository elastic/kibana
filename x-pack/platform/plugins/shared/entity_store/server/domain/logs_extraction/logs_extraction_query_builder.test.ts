/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildLogsExtractionEsqlQuery } from './logs_extraction_query_builder';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { EntityType } from '../../../common/domain/definitions/entity_schema';
import { validateQuery } from '@kbn/esql-language';

describe('buildLogsExtractionEsqlQuery', () => {
  Object.values(EntityType.enum).forEach((type) => {
    it(`generates the expected query for ${type} entity description`, async () => {
      const query = buildLogsExtractionEsqlQuery({
        indexPatterns: ['test-index-*'],
        latestIndex: 'latest-index',
        entityDefinition: getEntityDefinition(type, 'default'),
        docsLimit: 10000,
        fromDateISO: '2022-01-01T00:00:00.000Z',
        toDateISO: '2022-01-01T23:59:59.999Z',
      });
      expect(query).toMatchSnapshot();
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
    });
  });

  it(`generates the expected query for host with pagination`, async () => {
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['test-index-*'],
      latestIndex: 'latest-index',
      entityDefinition: getEntityDefinition('host', 'default'),
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      pagination: {
        idCursor: '123',
      },
    });
    expect(query).toMatchSnapshot();
    await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
  });

  it('excludes managed fields from STATS, merge EVAL, and produces a valid query', async () => {
    const base = getEntityDefinition('host', 'default');
    // Inject a managed field alongside a normal log-derived field to verify orthogonality.
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['test-index-*'],
      latestIndex: 'latest-index',
      entityDefinition: {
        ...base,
        fields: [
          ...base.fields,
          {
            source: 'test.api_only_field',
            destination: 'test.api_only_field',
            mapping: { type: 'keyword' },
            retention: { operation: 'managed' },
            allowAPIUpdate: true,
          },
          {
            source: 'test.log_field',
            destination: 'test.log_field',
            mapping: { type: 'keyword' },
            retention: { operation: 'prefer_newest_value' },
          },
        ],
      },
      docsLimit: 100,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
    });
    // managed field must not appear in STATS or the merge EVAL
    expect(query).not.toContain('test.api_only_field');
    // log-derived field must be present
    expect(query).toContain('test.log_field');
    // Query must remain syntactically valid (no dangling recent.* references)
    await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
  });

  describe('single-mode guard: the process split must not reach the single process', () => {
    it.each(Object.values(EntityType.enum))(
      '%s: single mode renders no extraction gate',
      (type) => {
        const query = buildLogsExtractionEsqlQuery({
          indexPatterns: ['test-index-*'],
          latestIndex: 'latest-index',
          entityDefinition: getEntityDefinition(type, 'default'),
          docsLimit: 10000,
          fromDateISO: '2022-01-01T00:00:00.000Z',
          toDateISO: '2022-01-01T23:59:59.999Z',
        });
        // The gate is the only clause the dual-process modes add to the source WHERE, so an unchanged
        // source clause is what keeps the single process byte-identical.
        const sourceClause = query.split('| EVAL')[0];
        expect(sourceClause).not.toContain('event.kind');
      }
    );
  });

  describe('user extraction modes', () => {
    const buildForMode = (extractionMode: 'single' | 'priority' | 'nonPriority') =>
      buildLogsExtractionEsqlQuery({
        indexPatterns: ['test-index-*'],
        latestIndex: 'latest-index',
        entityDefinition: getEntityDefinition('user', 'default', extractionMode),
        docsLimit: 10000,
        fromDateISO: '2022-01-01T00:00:00.000Z',
        toDateISO: '2022-01-01T23:59:59.999Z',
      });

    const sourceClauseOf = (query: string) => query.split('| EVAL')[0];

    it('priority gates on asset documents', () => {
      expect(sourceClauseOf(buildForMode('priority'))).toContain(
        'AND (MV_CONTAINS(TO_STRING(event.kind), "asset"))'
      );
    });

    /**
     * A document with no `event.kind` belongs to the non-priority process, so the gate has to let
     * it through. In ES|QL, `NOT (MV_CONTAINS(event.kind, "asset"))` is neither true nor false when
     * the field is missing, and the document is dropped. The `IS NULL` part is what keeps it.
     *
     * This checks the generated ES|QL text on purpose. Running the condition through our in-memory
     * evaluator would report the document as matching either way, and so would not catch the bug.
     */
    it('nonPriority gates on the complement, including documents without event.kind', () => {
      expect(sourceClauseOf(buildForMode('nonPriority'))).toContain(
        'AND (TO_STRING(event.kind) IS NULL OR NOT (MV_CONTAINS(TO_STRING(event.kind), "asset")))'
      );
    });

    it('both modes differ from single only in the source WHERE clause', () => {
      const single = buildForMode('single');
      const afterSourceClause = (query: string) => query.slice(sourceClauseOf(query).length);

      expect(afterSourceClause(buildForMode('priority'))).toBe(afterSourceClause(single));
      expect(afterSourceClause(buildForMode('nonPriority'))).toBe(afterSourceClause(single));
    });
  });

  it('inserts whenConditionTrueSetFieldsAfterStats EVAL after LOOKUP and before merge EVAL', () => {
    const base = getEntityDefinition('host', 'default');
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['test-index-*'],
      latestIndex: 'latest-index',
      entityDefinition: {
        ...base,
        whenConditionTrueSetFieldsAfterStats: [
          {
            condition: { field: 'host.name', eq: 'server1' },
            fields: { 'host.name': { source: 'host.id' } },
          },
        ],
      },
      docsLimit: 100,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
    });
    const statsIdx = query.indexOf('| STATS');
    const lookupIdx = query.indexOf('LOOKUP JOIN');
    const afterStatsEvalIdx = query.indexOf('recent.host.name = CASE(');
    const mergeCoalesceIdx = query.indexOf('entity.name = COALESCE(');
    expect(statsIdx).toBeGreaterThan(-1);
    expect(lookupIdx).toBeGreaterThan(statsIdx);
    expect(afterStatsEvalIdx).toBeGreaterThan(lookupIdx);
    expect(mergeCoalesceIdx).toBeGreaterThan(afterStatsEvalIdx);
  });
});
