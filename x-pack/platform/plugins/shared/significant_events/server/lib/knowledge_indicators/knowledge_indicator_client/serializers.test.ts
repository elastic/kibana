/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureUpsert, StreamQuery } from '@kbn/significant-events-schema';
import { computeFeatureUuid } from '@kbn/significant-events-schema';
import { computeRuleId } from '../helpers/compute_rule_id';
import { fromStoredFeature, fromStoredQuery, toStoredFeature, toStoredQuery } from './serializers';

const SPACE = 'marketing';
const SOURCE_ID = 'logs.test';

function makeQuery(overrides: Partial<StreamQuery> = {}): StreamQuery {
  return {
    id: 'q-1',
    title: 'Test query',
    description: 'desc',
    type: 'match',
    esql: { query: 'FROM logs-* | WHERE x == 1' },
    ...overrides,
  };
}

function makeFeature(overrides: Partial<FeatureUpsert> = {}): FeatureUpsert {
  return {
    id: 'Svc-Checkout',
    type: 'entity',
    subtype: 'service',
    description: 'Checkout service',
    properties: { name: 'checkout' },
    confidence: 80,
    ...overrides,
  };
}

const storeQuery = (query: StreamQuery & { rule_backed?: boolean; rule_id?: string }) =>
  toStoredQuery({ space: SPACE, sourceId: SOURCE_ID, query, includeEmbedding: false });

describe('toStoredQuery', () => {
  it('normalizes feature ids so they match the stored feature slug', () => {
    const stored = storeQuery(makeQuery({ features: [{ id: ' Svc-F ' }] }));

    expect(stored.query.features).toEqual([{ id: 'svc-f' }]);
  });

  it('leaves an already-normalized feature id unchanged', () => {
    const stored = storeQuery(makeQuery({ features: [{ id: 'svc-a' }] }));

    expect(stored.query.features).toEqual([{ id: 'svc-a' }]);
  });

  it('leaves a query with no features as undefined', () => {
    const stored = storeQuery(makeQuery());

    expect(stored.query.features).toBeUndefined();
  });

  it('keys the revision by source id', () => {
    const stored = storeQuery(makeQuery());

    expect(stored['source.id']).toBe(SOURCE_ID);
    expect(stored).not.toHaveProperty('stream.name');
  });

  it('derives the rule id from the space, source, query id and esql', () => {
    const query = makeQuery();
    const stored = storeQuery(query);

    expect(stored.query.rule_id).toBe(computeRuleId(SPACE, SOURCE_ID, query.id, query.esql.query));
  });

  it('keeps a stored rule id instead of recomputing it', () => {
    const stored = storeQuery({ ...makeQuery(), rule_id: 'existing-rule' });

    expect(stored.query.rule_id).toBe('existing-rule');
  });

  it('round-trips the source id onto the query link', () => {
    expect(fromStoredQuery(storeQuery(makeQuery())).stream_name).toBe(SOURCE_ID);
  });
});

describe('toStoredFeature', () => {
  it('keys the revision by source id and derives the uuid from (source id, slug)', () => {
    const stored = toStoredFeature({
      sourceId: SOURCE_ID,
      feature: makeFeature(),
      includeEmbedding: false,
    });

    expect(stored['source.id']).toBe(SOURCE_ID);
    expect(stored.feature.slug).toBe('svc-checkout');
    expect(stored.id).toBe(computeFeatureUuid({ id: 'svc-checkout', stream_name: SOURCE_ID }));
    expect(stored).not.toHaveProperty('stream.name');
  });

  it('labels the search embedding with the source', () => {
    const stored = toStoredFeature({
      sourceId: SOURCE_ID,
      feature: makeFeature(),
      includeEmbedding: true,
    });

    expect(stored.search_embedding).toContain(`Source: ${SOURCE_ID}`);
  });

  it('round-trips the source id onto the feature', () => {
    const stored = toStoredFeature({
      sourceId: SOURCE_ID,
      feature: makeFeature(),
      includeEmbedding: false,
    });

    expect(fromStoredFeature(stored).stream_name).toBe(SOURCE_ID);
  });
});
