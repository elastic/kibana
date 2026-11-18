/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { describeOntology } from './describe_ontology';

const pattern = {
  question_type: 'orders of a customer',
  esql_template: 'FROM orders | WHERE customer_id == ?customer',
  esql_example: 'FROM orders | WHERE customer_id == "c-1"',
  returns: 'Orders',
};

const kis = [
  {
    id: 'ontology-term--customer',
    type: 'ontology.term',
    title: 'Customer',
    attributes: {
      'ontology.synonyms': ['client'],
      'ontology.fields': ['orders:customer_id', 'customers:id'],
    },
  },
  {
    id: 'ontology-dataset--orders',
    type: 'ontology.dataset',
    title: 'orders',
    description: 'One row per order.',
    attributes: { access_patterns: [JSON.stringify(pattern)] },
  },
  {
    id: 'ontology-dataset--customers',
    type: 'ontology.dataset',
    title: 'customers',
    description: 'One row per customer.',
    attributes: { 'ontology.status': 'certified' },
  },
  {
    id: 'gone',
    type: 'ontology.term',
    title: 'Gone',
    governance: { lifecycle: { status: 'deleted' } },
  },
];

describe('describeOntology', () => {
  const dest = { type: 'index' as const, value: 'ai-index-idx-shop' };

  it('lists certified entries first, datasets before terms, with an example query', async () => {
    const search = jest.fn(async () => ({ hits: { hits: kis.map((ki) => ({ _source: ki })) } }));

    const lines = await describeOntology({
      esClient: { search } as unknown as ElasticsearchClient,
      dest,
      spaceId: 'default',
      kiTypeCounts: [{ type: 'ontology.dataset', count: 2 }],
    });

    expect(lines).toEqual([
      'Ontology (datasets and business terms discovered from the ES|QL sources; certified entries were reviewed by a person)',
      '[certified] dataset customers: One row per customer.',
      '[draft] dataset orders: One row per order.\n  Example: FROM orders | WHERE customer_id == "c-1"',
      '[draft] term Customer (also client): orders:customer_id, customers:id',
      'Read an entry for its full description and access patterns: filter KIs by type ontology.dataset or ontology.term.',
    ]);
  });

  it('reads nothing when the AI index holds no ontology KI', async () => {
    const search = jest.fn();

    const lines = await describeOntology({
      esClient: { search } as unknown as ElasticsearchClient,
      dest,
      spaceId: 'default',
      kiTypeCounts: [{ type: 'fact.preference', count: 3 }],
    });

    expect(lines).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});
