/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { clearRelationshipIdsByEntitySource } from './entity_relationships';

describe('clearRelationshipIdsByEntitySource', () => {
  const buildEsClient = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.updateByQuery.mockResolvedValue({ updated: 2, total: 2 } as never);
    return esClient;
  };

  it('narrows to the given source and only entities holding the relationship', async () => {
    const esClient = buildEsClient();

    await clearRelationshipIdsByEntitySource(esClient, {
      index: 'entities-latest-default',
      entitySource: 'workday',
      relationshipKey: 'supervises',
    });

    const body = esClient.updateByQuery.mock.calls[0][0] as {
      index: string;
      query: { bool: { filter: unknown[] } };
    };
    expect(body.index).toBe('entities-latest-default');
    expect(body.query.bool.filter).toEqual([
      { term: { 'entity.source': 'workday' } },
      { exists: { field: 'entity.relationships.supervises.ids' } },
    ]);
  });

  it('removes only the targeted relationship key', async () => {
    const esClient = buildEsClient();

    await clearRelationshipIdsByEntitySource(esClient, {
      index: 'entities-latest-default',
      entitySource: 'workday',
      relationshipKey: 'supervises',
    });

    const body = esClient.updateByQuery.mock.calls[0][0] as {
      script: { source: string; params: Record<string, unknown> };
    };
    // The key travels as a param, never interpolated into the script source —
    // a relationshipKey is config-supplied and must not reach Painless as code.
    expect(body.script.params).toEqual({ relationshipKey: 'supervises' });
    expect(body.script.source).not.toContain('supervises');
  });

  it('returns the update counts', async () => {
    const esClient = buildEsClient();

    const result = await clearRelationshipIdsByEntitySource(esClient, {
      index: 'entities-latest-default',
      entitySource: 'workday',
      relationshipKey: 'supervises',
    });

    expect(result).toEqual({ updated: 2, total: 2 });
  });
});
