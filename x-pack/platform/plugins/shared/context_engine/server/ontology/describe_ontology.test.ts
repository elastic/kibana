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

const call = {
  question_type: 'files of an owner',
  sub_action: 'searchFiles',
  params_template: '{"owner":"?owner"}',
  params_example: '{"owner":"ana@example.com"}',
  returns: 'Files',
  connector_id: 'drive-1',
};

const kis = [
  {
    id: 'ontology-term--order',
    type: 'ontology.term',
    title: 'Order',
    attributes: { 'ontology.fields': ['orders:id'] },
  },
  {
    id: 'ontology-term--customer',
    type: 'ontology.term',
    title: 'customer',
    attributes: {
      'ontology.entity_type': 'customer',
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
    id: 'ontology-dataset--drive',
    type: 'ontology.dataset',
    title: 'Team drive',
    description: 'Shared files.',
    attributes: { 'ontology.connector_access_patterns': [JSON.stringify(call)] },
  },
  { id: 'rel', type: 'memory.relationship', title: 'customer stored in orders' },
  {
    id: 'gone',
    type: 'ontology.term',
    title: 'Gone',
    governance: { lifecycle: { status: 'deleted' } },
  },
];

describe('describeOntology', () => {
  const dest = { type: 'index' as const, value: 'ai-index-idx-shop' };

  it('lists datasets with an example call, then entity types, then discovered terms', async () => {
    const search = jest.fn(async () => ({ hits: { hits: kis.map((ki) => ({ _source: ki })) } }));

    const lines = await describeOntology({
      esClient: { search } as unknown as ElasticsearchClient,
      dest,
      spaceId: 'default',
      kiTypeCounts: [{ type: 'ontology.dataset', count: 2 }],
    });

    expect(lines).toEqual([
      'Ontology (the datasets the sources read and the business terms they store)',
      'dataset Team drive: Shared files.\n  Example: execute_connector_sub_action {"connectorId":"drive-1","subAction":"searchFiles","params":{"owner":"ana@example.com"}}',
      'dataset orders: One row per order.\n  Example: FROM orders | WHERE customer_id == "c-1"',
      'entity type customer (also client): orders:customer_id, customers:id',
      'term Order: orders:id',
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
