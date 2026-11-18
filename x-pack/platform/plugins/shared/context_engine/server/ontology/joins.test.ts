/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { OntologyCatalogEntry } from '../../common/step_types/catalog_ontology_sources';
import { verifyOntologyJoins } from './joins';

const field = (name: string, type: string) => ({
  name,
  type,
  searchable: true,
  aggregatable: true,
});

const catalog: OntologyCatalogEntry[] = [
  {
    name: 'orders',
    kind: 'index',
    source_ids: [],
    fields: [field('customer_id', 'keyword'), field('total', 'double'), field('qty', 'long')],
  },
  {
    name: 'customers',
    kind: 'index',
    source_ids: [],
    fields: [field('id', 'keyword'), field('age', 'integer')],
  },
];

const join = {
  from_dataset: 'orders',
  from_field: 'customer_id',
  to_dataset: 'customers',
  to_field: 'id',
};

const mockClient = ({ values, matched }: { values: unknown[]; matched: number }) => {
  const esql = jest.fn(async () => ({
    columns: [{ name: 'customer_id', type: 'keyword' }],
    values: values.map((value) => [value]),
  }));
  const search = jest.fn(async () => ({ aggregations: { matched: { value: matched } } }));
  return {
    esql,
    search,
    client: { esql: { query: esql }, search } as unknown as ElasticsearchClient,
  };
};

describe('verifyOntologyJoins', () => {
  it('keeps a join when enough sampled values match on the other side', async () => {
    const { client, esql, search } = mockClient({ values: ['c1', 'c2', 'c3', 'c4'], matched: 3 });

    const output = await verifyOntologyJoins({ esClient: client, catalog, candidates: [join] });

    expect(output).toEqual({
      verified: [{ ...join, overlap: 0.75, sampled: 4 }],
      rejected: [],
    });
    expect(esql).toHaveBeenCalledWith(
      {
        query:
          'FROM "orders" | WHERE `customer_id` IS NOT NULL | STATS BY `customer_id` | LIMIT 200',
      },
      expect.anything()
    );
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'customers',
        query: { terms: { id: ['c1', 'c2', 'c3', 'c4'] } },
      }),
      expect.anything()
    );
  });

  it('rejects a join whose values mostly do not match', async () => {
    const { client } = mockClient({ values: ['c1', 'c2', 'c3', 'c4'], matched: 1 });

    const output = await verifyOntologyJoins({ esClient: client, catalog, candidates: [join] });

    expect(output.rejected).toEqual([
      {
        candidate: 'orders.customer_id = customers.id',
        reason: 'only 25% of 4 sampled values match',
      },
    ]);
  });

  it('rejects malformed, duplicate, uncataloged and incompatible candidates without querying', async () => {
    const { client, esql } = mockClient({ values: ['c1'], matched: 1 });

    const output = await verifyOntologyJoins({
      esClient: client,
      catalog,
      candidates: [
        { from_dataset: 'orders' },
        join,
        {
          ...join,
          from_dataset: 'customers',
          from_field: 'id',
          to_dataset: 'orders',
          to_field: 'customer_id',
        },
        { ...join, to_dataset: 'secrets' },
        { ...join, from_field: 'total', to_field: 'age' },
        { ...join, from_field: 'qty', to_field: 'id' },
        { ...join, to_dataset: 'orders', to_field: 'customer_id' },
      ],
    });

    expect(output.verified).toHaveLength(1);
    expect(output.rejected.map(({ reason }) => reason)).toEqual([
      'malformed',
      'listed twice',
      'names a dataset or field that is not in the catalog',
      'cannot join a double field to a integer field',
      'cannot join a long field to a keyword field',
      'joins a dataset to itself',
    ]);
    expect(esql).toHaveBeenCalledTimes(1);
  });

  it('reports a check that fails', async () => {
    const { client, esql } = mockClient({ values: [], matched: 0 });
    esql.mockRejectedValueOnce(new Error('index_not_found'));

    const output = await verifyOntologyJoins({ esClient: client, catalog, candidates: [join] });

    expect(output.rejected).toEqual([
      {
        candidate: 'orders.customer_id = customers.id',
        reason: 'checking it failed: index_not_found',
      },
    ]);
  });
});
