/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { OntologyCatalogEntry } from '../../common/step_types/catalog_ontology_sources';
import type { OntologyChangeSet } from '../../common/step_types/apply_ontology_changes';
import { findKiRevision, putKiRevision, type KiRevision } from '../ai_indices/ki_revision';
import { softDeleteKi } from '../ai_indices/ki_write';
import type { PlannedWrite } from '../dreaming/apply';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { relationshipId, relationshipKey } from '../dreaming/ids';
import {
  applyOntologyChanges,
  parseTermField,
  type OntologyApplyContext,
  type OntologyApplyInput,
} from './apply';
import { datasetKiId, esqlSourceUri, termKiId } from './ids';

jest.mock('../ai_indices/ki_revision', () => ({
  ...jest.requireActual('../ai_indices/ki_revision'),
  findKiRevision: jest.fn(),
  putKiRevision: jest.fn(),
}));
jest.mock('../ai_indices/ki_write', () => ({ softDeleteKi: jest.fn() }));

const NOW = new Date('2026-11-18T12:00:00.000Z');
const writer = { uri: 'workflow://ontology', metadata: { run_id: 'exec-1' } };
const spacePermissions = { kibana: { privileges: [{ space: 'team-a' }] } };

const stored = new Map<string, DreamedKi>();

const revisionOf = (source: DreamedKi): KiRevision => ({
  index: 'ai-index-idx-a',
  documentId: source.id,
  seqNo: 3,
  primaryTerm: 1,
  source,
});

const written = () =>
  jest.mocked(putKiRevision).mock.calls.map(([{ document }]) => document as DreamedKi);
const writtenById = (id: string) => written().find((document) => document.id === id);

const context = (overrides: Partial<OntologyApplyContext> = {}): OntologyApplyContext => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  aiIndexId: 'a',
  dest: { type: 'index', value: 'ai-index-idx-a' },
  writer,
  spaceId: 'team-a',
  verifyEsql: jest.fn(async () => true),
  now: NOW,
  ...overrides,
});

const orders: OntologyCatalogEntry = {
  name: 'orders',
  kind: 'index',
  source_ids: ['src-1'],
  fields: [
    { name: '@timestamp', type: 'date', searchable: true, aggregatable: true },
    { name: 'customer_id', type: 'keyword', searchable: true, aggregatable: true },
    { name: 'total', type: 'double', searchable: true, aggregatable: true },
  ],
};
const customers: OntologyCatalogEntry = {
  name: 'customers',
  kind: 'index',
  source_ids: ['src-1'],
  fields: [{ name: 'id', type: 'keyword', searchable: true, aggregatable: true }],
};

const pattern = {
  question_type: 'orders of a customer',
  esql_template: 'FROM orders | WHERE customer_id == ?customer',
  esql_example: 'FROM orders | WHERE customer_id == "c-1"',
  returns: 'The orders of the customer',
};

const input = (
  changes: Partial<OntologyChangeSet>,
  rest: Partial<OntologyApplyInput> = {}
): OntologyApplyInput => ({
  catalog: [orders, customers],
  profiles: [],
  changes: { datasets: [], terms: [], ...changes },
  joins: [],
  stale: [],
  ...rest,
});

const describedDataset = (name: string, attributes: DreamedKi['attributes'] = {}): DreamedKi => ({
  id: datasetKiId(name),
  type: 'ontology.dataset',
  title: name,
  description: `Rows of ${name}.`,
  permissions: spacePermissions,
  attributes: { 'ontology.status': 'draft', 'ontology.index': name, ...attributes },
});

describe('applyOntologyChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stored.clear();
    jest.mocked(findKiRevision).mockImplementation(async ({ kiId }) => {
      const source = stored.get(kiId);
      return source ? revisionOf(source) : undefined;
    });
    jest.mocked(putKiRevision).mockImplementation(async ({ kiId, document }) => {
      stored.set(kiId, document as DreamedKi);
    });
    jest.mocked(softDeleteKi).mockResolvedValue(undefined as never);
  });

  it('writes a dataset with its profile, access patterns and sources, visible in the space', async () => {
    const result = await applyOntologyChanges(
      context(),
      input(
        {
          datasets: [
            {
              name: 'orders',
              description: 'One row per order.',
              content: 'Orders placed in the shop.',
              access_patterns: [pattern],
              source_round_ids: ['trace:abc', 'not-a-round'],
            },
          ],
        },
        {
          profiles: [
            {
              name: 'orders',
              kind: 'index',
              id: datasetKiId('orders'),
              fingerprint: 'fp-1',
              reason: 'new',
              time_field: '@timestamp',
              row_count: 42,
              fields: [],
              omitted_fields: 0,
              errors: [],
            },
          ],
        }
      )
    );

    expect(result).toEqual({
      created: 1,
      updated: 0,
      deleted: 0,
      rejected: [],
      dropped_access_patterns: 0,
    });
    const dataset = writtenById(datasetKiId('orders'));
    expect(dataset).toEqual(
      expect.objectContaining({
        type: 'ontology.dataset',
        title: 'orders',
        description: 'One row per order.',
        permissions: spacePermissions,
        references: [
          { uri: esqlSourceUri('src-1'), relation: 'derived_from' },
          { uri: 'trace://abc', relation: 'derived_from' },
        ],
      })
    );
    expect(dataset?.content).toContain('Orders placed in the shop.\n\n## Access patterns');
    expect(dataset?.attributes).toEqual({
      'ontology.status': 'draft',
      'ontology.index': 'orders',
      'ontology.kind': 'index',
      'ontology.fingerprint': 'fp-1',
      'ontology.profiled_at': NOW.toISOString(),
      'ontology.time_field': '@timestamp',
      'ontology.row_count': 42,
      access_patterns: [JSON.stringify(pattern)],
      esql: [pattern.esql_example],
    });
  });

  it('rejects a dataset that is not in the catalog, and one listed twice', async () => {
    const dataset = { name: 'orders', description: 'Orders.', content: 'Orders.' };
    const result = await applyOntologyChanges(
      context(),
      input({ datasets: [{ ...dataset, name: 'secrets' }, dataset, dataset] })
    );

    expect(result.rejected).toEqual([
      { item: 'dataset secrets', reason: "it is not a dataset of the AI index's ES|QL sources" },
      { item: 'dataset orders', reason: 'it is listed twice' },
    ]);
    expect(result.created).toBe(1);
  });

  it('never changes a certified dataset', async () => {
    stored.set(
      datasetKiId('orders'),
      describedDataset('orders', { 'ontology.status': 'certified' })
    );

    const result = await applyOntologyChanges(
      context(),
      input({ datasets: [{ name: 'orders', description: 'New.', content: 'New.' }] })
    );

    expect(result.rejected).toEqual([{ item: 'dataset orders', reason: 'it is certified' }]);
    expect(putKiRevision).not.toHaveBeenCalled();
  });

  it('leaves a KI of another kind alone when its id collides', async () => {
    stored.set(datasetKiId('orders'), {
      ...describedDataset('orders'),
      type: 'fact.preference',
    });

    const result = await applyOntologyChanges(
      context(),
      input({ datasets: [{ name: 'orders', description: 'New.', content: 'New.' }] })
    );

    expect(result.rejected).toEqual([
      { item: 'dataset orders', reason: 'its id belongs to a KI that is not part of the ontology' },
    ]);
    expect(putKiRevision).not.toHaveBeenCalled();
  });

  it('drops access patterns whose example does not run, keeping the current ones if all fail', async () => {
    const current = describedDataset('orders', {
      access_patterns: [JSON.stringify(pattern)],
      esql: [pattern.esql_example],
    });
    stored.set(current.id, current);
    const broken = { ...pattern, esql_example: 'FROM orders | WHERE nope' };

    const result = await applyOntologyChanges(
      context({ verifyEsql: jest.fn(async (query: string) => !query.includes('nope')) }),
      input({
        datasets: [
          {
            name: 'orders',
            description: 'One row per order.',
            content: 'Orders.',
            access_patterns: [broken],
          },
        ],
      })
    );

    expect(result.dropped_access_patterns).toBe(1);
    expect(writtenById(current.id)?.attributes?.access_patterns).toEqual([JSON.stringify(pattern)]);
  });

  it('writes a term with its cataloged fields and links it to the datasets that store it', async () => {
    stored.set(datasetKiId('orders'), describedDataset('orders'));

    const result = await applyOntologyChanges(
      context(),
      input({
        terms: [
          {
            name: 'Customer',
            description: 'Someone who buys.',
            synonyms: ['client', 'customer', 'Client'],
            fields: ['orders:customer_id', 'orders:missing', 'nowhere:id', 'customers:id'],
          },
        ],
      })
    );

    const term = writtenById(termKiId('Customer'));
    expect(term).toEqual(
      expect.objectContaining({
        type: 'ontology.term',
        title: 'Customer',
        description: 'Someone who buys.',
        content:
          'Someone who buys.\n\nAlso called: client.\n\nStored in:\n- orders: customer_id\n- customers: id',
      })
    );
    expect(term?.attributes).toEqual({
      'ontology.status': 'draft',
      'ontology.synonyms': ['client'],
      'ontology.fields': ['orders:customer_id', 'customers:id'],
    });
    const storedIn = writtenById(
      relationshipId(relationshipKey(termKiId('Customer'), 'stored_in', datasetKiId('orders')))
    );
    expect(storedIn).toEqual(
      expect.objectContaining({
        type: 'memory.relationship',
        title: 'Customer stored in orders',
        description: 'Customer is stored in orders as customer_id.',
        attributes: {
          'relationship.relation': 'stored_in',
          'memory.key': relationshipKey(termKiId('Customer'), 'stored_in', datasetKiId('orders')),
        },
      })
    );
    expect(result.rejected).toEqual([
      {
        item: 'relationship Customer stored_in customers',
        reason: 'the dataset is not described yet',
      },
    ]);
    expect(result.created).toBe(2);
  });

  it('rejects a term that names no cataloged field, and deletes a draft term on request', async () => {
    stored.set(termKiId('Invoice'), {
      id: termKiId('Invoice'),
      type: 'ontology.term',
      title: 'Invoice',
      permissions: spacePermissions,
      attributes: { 'ontology.status': 'draft' },
    });

    const result = await applyOntologyChanges(
      context(),
      input({
        terms: [
          { name: 'Ghost', fields: ['nowhere:id'] },
          { name: 'Invoice', delete: true },
        ],
      })
    );

    expect(result.rejected).toEqual([
      {
        item: 'term Ghost',
        reason: 'it names no field of a cataloged dataset as <dataset>:<field>',
      },
    ]);
    expect(result.deleted).toBe(1);
    expect(softDeleteKi).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kiId: termKiId('Invoice'), deleteLinkedRelationships: true })
    );
  });

  it('writes a verified join between two described datasets', async () => {
    stored.set(datasetKiId('orders'), describedDataset('orders'));
    stored.set(datasetKiId('customers'), describedDataset('customers'));

    const result = await applyOntologyChanges(
      context(),
      input(
        {},
        {
          joins: [
            {
              from_dataset: 'orders',
              from_field: 'customer_id',
              to_dataset: 'customers',
              to_field: 'id',
              overlap: 0.9,
              sampled: 200,
            },
          ],
        }
      )
    );

    expect(result.created).toBe(1);
    const join = written()[0];
    expect(join).toEqual(
      expect.objectContaining({
        type: 'memory.relationship',
        title: 'orders joins with customers',
        attributes: expect.objectContaining({
          'relationship.relation': 'joins_with',
          'ontology.from_field': 'customer_id',
          'ontology.to_field': 'id',
          'ontology.overlap': 0.9,
        }),
      })
    );
    expect(join.description).toContain('90% of 200 sampled values');
  });

  it('deletes stale draft datasets but keeps certified ones', async () => {
    stored.set(datasetKiId('orders'), describedDataset('orders'));
    stored.set(
      datasetKiId('customers'),
      describedDataset('customers', { 'ontology.status': 'certified' })
    );

    const result = await applyOntologyChanges(
      context(),
      input({}, { stale: [datasetKiId('orders'), datasetKiId('customers')] })
    );

    expect(result.deleted).toBe(1);
    expect(result.rejected).toEqual([
      {
        item: `dataset ${datasetKiId('customers')}`,
        reason: 'it is certified; delete it by hand if its dataset is gone',
      },
    ]);
  });

  it('writes nothing on a dry run and reports what it would write', async () => {
    const dryRun = new Map<string, PlannedWrite>();

    const result = await applyOntologyChanges(
      context({ dryRun }),
      input({ datasets: [{ name: 'orders', description: 'Orders.', content: 'Orders.' }] })
    );

    expect(result.created).toBe(1);
    expect(putKiRevision).not.toHaveBeenCalled();
    expect(dryRun.get(datasetKiId('orders'))).toEqual(
      expect.objectContaining({ change: 'created' })
    );
  });

  it('does not rewrite a KI that would not change', async () => {
    const change = { name: 'orders', description: 'Orders.', content: 'Orders.' };
    await applyOntologyChanges(context(), input({ datasets: [change] }));
    jest.mocked(putKiRevision).mockClear();

    const result = await applyOntologyChanges(context(), input({ datasets: [change] }));

    expect(result.updated).toBe(0);
    expect(putKiRevision).not.toHaveBeenCalled();
  });
});

describe('parseTermField', () => {
  it('splits at the last colon, so remote dataset names keep theirs', () => {
    expect(parseTermField('orders:customer_id')).toEqual({
      dataset: 'orders',
      field: 'customer_id',
    });
    expect(parseTermField('cluster-a:orders:id')).toEqual({
      dataset: 'cluster-a:orders',
      field: 'id',
    });
    expect(parseTermField('orders')).toBeUndefined();
    expect(parseTermField(':id')).toBeUndefined();
    expect(parseTermField('orders:')).toBeUndefined();
  });
});
