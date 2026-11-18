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
  removeOntologySource,
  type OntologyApplyContext,
  type OntologyApplyInput,
} from './apply';
import { readOntologyKis } from './existing';
import { datasetKiId, sourceUri, termKiId } from './ids';

jest.mock('../ai_indices/ki_revision', () => ({
  ...jest.requireActual('../ai_indices/ki_revision'),
  findKiRevision: jest.fn(),
  putKiRevision: jest.fn(),
}));
jest.mock('../ai_indices/ki_write', () => ({ softDeleteKi: jest.fn() }));
jest.mock('./existing', () => ({
  ...jest.requireActual('./existing'),
  readOntologyKis: jest.fn(),
}));

const NOW = new Date('2026-11-18T12:00:00.000Z');
const writer = { uri: 'workflow://ontology', metadata: { run_id: 'exec-1' } };
const spacePermissions = { kibana: { privileges: [{ space: 'team-a' }] } };
const SOURCE = 'src-orders';
const OTHER_SOURCE = 'src-crm';

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
const writtenById = (id: string) => [...written()].reverse().find((document) => document.id === id);

const context = (overrides: Partial<OntologyApplyContext> = {}): OntologyApplyContext => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  aiIndexId: 'a',
  dest: { type: 'index', value: 'ai-index-idx-a' },
  writer,
  spaceId: 'team-a',
  sourceId: SOURCE,
  entityTypes: [],
  verifyEsql: jest.fn(async () => true),
  now: NOW,
  ...overrides,
});

const field = (name: string, type = 'keyword') => ({
  name,
  type,
  searchable: true,
  aggregatable: true,
});

const orders: OntologyCatalogEntry = {
  name: 'orders',
  kind: 'index',
  source_ids: [SOURCE],
  fields: [field('@timestamp', 'date'), field('customer_id'), field('total', 'double')],
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
  catalog: [orders],
  profiles: [],
  changes: { datasets: [], terms: [], ...changes },
  joins: [],
  stale: [],
  ...rest,
});

const describedDataset = (
  name: string,
  sources: string[] = [SOURCE],
  attributes: DreamedKi['attributes'] = {}
): DreamedKi => ({
  id: datasetKiId(name),
  type: 'ontology.dataset',
  title: name,
  description: `Rows of ${name}.`,
  permissions: spacePermissions,
  attributes: { 'ontology.index': name, 'ontology.kind': 'index', ...attributes },
  references: sources.map((id) => ({ uri: sourceUri(id), relation: 'derived_from' as const })),
});

const customerTerm = (fields: string[], sources: string[]): DreamedKi => ({
  id: termKiId('Customer'),
  type: 'ontology.term',
  title: 'Customer',
  description: 'Someone who buys.',
  permissions: spacePermissions,
  attributes: { 'ontology.fields': fields, 'ontology.synonyms': [] },
  references: sources.map((id) => ({ uri: sourceUri(id), relation: 'derived_from' as const })),
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
    jest.mocked(softDeleteKi).mockImplementation(async (_client, { kiId }) => {
      stored.delete(kiId);
      return undefined as never;
    });
    jest.mocked(readOntologyKis).mockImplementation(async () => [...stored.values()]);
  });

  it('writes a dataset with its profile, join fields, access patterns and source', async () => {
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
          { uri: sourceUri(SOURCE), relation: 'derived_from' },
          { uri: 'trace://abc', relation: 'derived_from' },
        ],
      })
    );
    expect(dataset?.content).toContain('Orders placed in the shop.\n\n## Access patterns');
    expect(dataset?.attributes).toEqual({
      'ontology.index': 'orders',
      'ontology.kind': 'index',
      'ontology.join_fields': ['customer_id:keyword'],
      'ontology.fingerprint': 'fp-1',
      'ontology.profiled_at': NOW.toISOString(),
      'ontology.time_field': '@timestamp',
      'ontology.row_count': 42,
      access_patterns: [JSON.stringify(pattern)],
      esql: [pattern.esql_example],
    });
  });

  it('rejects a dataset that is not one of this source, and one listed twice', async () => {
    const dataset = { name: 'orders', description: 'Orders.', content: 'Orders.' };
    const result = await applyOntologyChanges(
      context(),
      input({ datasets: [{ ...dataset, name: 'secrets' }, dataset, dataset] })
    );

    expect(result.rejected).toEqual([
      { item: 'dataset secrets', reason: 'it is not a dataset of this source' },
      { item: 'dataset orders', reason: 'it is listed twice' },
    ]);
    expect(result.created).toBe(1);
  });

  it('adds its source to a dataset another source described, keeping that source', async () => {
    stored.set(datasetKiId('orders'), describedDataset('orders', [OTHER_SOURCE]));

    await applyOntologyChanges(
      context(),
      input({ datasets: [{ name: 'orders', description: 'Orders.', content: 'Orders.' }] })
    );

    expect(writtenById(datasetKiId('orders'))?.references).toEqual([
      { uri: sourceUri(OTHER_SOURCE), relation: 'derived_from' },
      { uri: sourceUri(SOURCE), relation: 'derived_from' },
    ]);
  });

  it('leaves a KI of another kind alone when its id collides', async () => {
    stored.set(datasetKiId('orders'), { ...describedDataset('orders'), type: 'fact.preference' });

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
    const current = describedDataset('orders', [SOURCE], {
      access_patterns: [JSON.stringify(pattern)],
      esql: [pattern.esql_example],
    });
    stored.set(current.id, current);
    const broken = { ...pattern, esql_example: 'FROM orders | WHERE nope' };

    const result = await applyOntologyChanges(
      context({ verifyEsql: jest.fn(async (query: string) => !query.includes('nope')) }),
      input({
        datasets: [
          { name: 'orders', description: 'Orders.', content: 'Orders.', access_patterns: [broken] },
        ],
      })
    );

    expect(result.dropped_access_patterns).toBe(1);
    expect(writtenById(current.id)?.attributes?.access_patterns).toEqual([JSON.stringify(pattern)]);
  });

  describe('terms', () => {
    beforeEach(() => {
      stored.set(datasetKiId('orders'), describedDataset('orders'));
    });

    it('writes a term with its fields and links it to the datasets that store it', async () => {
      const result = await applyOntologyChanges(
        context(),
        input({
          terms: [
            {
              name: 'Customer',
              description: 'Someone who buys.',
              synonyms: ['client', 'customer', 'Client'],
              fields: ['orders:customer_id', 'orders:missing', 'crm:id'],
            },
          ],
        })
      );

      const term = writtenById(termKiId('Customer'));
      expect(term).toEqual(
        expect.objectContaining({
          type: 'ontology.term',
          title: 'Customer',
          content: 'Someone who buys.\n\nAlso called: client.\n\nStored in:\n- orders: customer_id',
          references: [{ uri: sourceUri(SOURCE), relation: 'derived_from' }],
        })
      );
      expect(term?.attributes).toEqual({
        'ontology.synonyms': ['client'],
        'ontology.fields': ['orders:customer_id'],
      });
      expect(
        writtenById(
          relationshipId(relationshipKey(termKiId('Customer'), 'stored_in', datasetKiId('orders')))
        )
      ).toEqual(
        expect.objectContaining({
          title: 'Customer stored in orders',
          description: 'Customer is stored in orders as customer_id.',
        })
      );
      expect(result).toEqual(expect.objectContaining({ created: 2, rejected: [] }));
    });

    it("keeps the fields other sources gave a term, replacing only this source's", async () => {
      stored.set(
        termKiId('Customer'),
        customerTerm(['crm:id', 'orders:old_customer'], [OTHER_SOURCE, SOURCE])
      );
      stored.set(
        relationshipId(relationshipKey(termKiId('Customer'), 'stored_in', datasetKiId('orders'))),
        {
          id: 'old-stored-in',
          type: 'memory.relationship',
          title: 'Customer stored in orders',
          permissions: spacePermissions,
        }
      );

      await applyOntologyChanges(
        context(),
        input({ terms: [{ name: 'Customer', fields: ['orders:customer_id'] }] })
      );

      expect(writtenById(termKiId('Customer'))?.attributes?.['ontology.fields']).toEqual([
        'crm:id',
        'orders:customer_id',
      ]);
    });

    it("takes this source's fields off a term on delete, deleting it when none is left", async () => {
      stored.set(termKiId('Customer'), customerTerm(['orders:customer_id'], [SOURCE]));

      const result = await applyOntologyChanges(
        context(),
        input({ terms: [{ name: 'Customer', delete: true }] })
      );

      expect(result.deleted).toBeGreaterThanOrEqual(1);
      expect(softDeleteKi).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ kiId: termKiId('Customer') })
      );
    });

    it('rejects a new term that names no field of this source', async () => {
      const result = await applyOntologyChanges(
        context(),
        input({ terms: [{ name: 'Ghost', fields: ['crm:id'] }] })
      );

      expect(result.rejected).toEqual([
        {
          item: 'term Ghost',
          reason: "it names no field of this source's datasets as <dataset>:<field>",
        },
      ]);
    });

    it('writes only configured entity types once there are any, with their attributes', async () => {
      const result = await applyOntologyChanges(
        context({
          entityTypes: [
            { type: 'customer', description: 'A paying customer.', attributes: ['segment'] },
          ],
        }),
        input({
          terms: [
            {
              name: 'Customer',
              description: 'Model description.',
              fields: ['orders:customer_id'],
              attributes: [
                { attribute: 'segment', field: 'orders:customer_id' },
                { attribute: 'unknown', field: 'orders:customer_id' },
              ],
            },
            { name: 'Invoice', fields: ['orders:total'] },
          ],
        })
      );

      expect(result.rejected).toEqual([
        { item: 'term Invoice', reason: 'it is not a configured entity type' },
      ]);
      const term = writtenById(termKiId('customer'));
      expect(term).toEqual(
        expect.objectContaining({ title: 'customer', description: 'A paying customer.' })
      );
      expect(term?.attributes).toEqual(
        expect.objectContaining({
          'ontology.entity_type': 'customer',
          'ontology.attribute_fields': ['segment=orders:customer_id'],
        })
      );
    });
  });

  it('writes a verified join between two described datasets', async () => {
    stored.set(datasetKiId('orders'), describedDataset('orders'));
    stored.set(datasetKiId('customers'), describedDataset('customers', [OTHER_SOURCE]));

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
    const [join] = written();
    expect(join).toEqual(
      expect.objectContaining({
        title: 'orders joins with customers',
        attributes: expect.objectContaining({
          'relationship.relation': 'joins_with',
          'ontology.overlap': 0.9,
        }),
      })
    );
    expect(join.description).toContain('90% of 200 sampled values');
  });

  it('drops a stale dataset from this source: deleted when it was the only one, fields off terms', async () => {
    stored.set(datasetKiId('orders'), describedDataset('orders'));
    stored.set(datasetKiId('shared'), describedDataset('shared', [SOURCE, OTHER_SOURCE]));
    stored.set(termKiId('Customer'), customerTerm(['orders:customer_id', 'crm:id'], [SOURCE]));

    const result = await applyOntologyChanges(
      context(),
      input({}, { stale: [datasetKiId('orders'), datasetKiId('shared')] })
    );

    expect(softDeleteKi).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kiId: datasetKiId('orders'), deleteLinkedRelationships: true })
    );
    expect(writtenById(datasetKiId('shared'))?.references).toEqual([
      { uri: sourceUri(OTHER_SOURCE), relation: 'derived_from' },
    ]);
    expect(writtenById(termKiId('Customer'))?.attributes?.['ontology.fields']).toEqual(['crm:id']);
    expect(result.deleted).toBe(1);
  });

  describe('connector sources', () => {
    const drive: OntologyCatalogEntry = {
      name: 'connector:drive-1',
      kind: 'connector',
      source_ids: [SOURCE],
      fields: [{ ...field('searchFiles.files.owners.emailAddress'), searchable: false }],
    };
    const call = {
      question_type: 'files of an owner',
      sub_action: 'searchFiles',
      params_template: '{"query":"\'?owner\' in owners"}',
      params_example: '{"query":"\'ana@example.com\' in owners"}',
      returns: 'The files',
    };

    it('keeps connector access patterns whose example call succeeds, tagged with the connector', async () => {
      const verifyConnectorCall = jest.fn(async (subAction: string) => subAction === 'searchFiles');

      const result = await applyOntologyChanges(
        context({ connectorId: 'drive-1', verifyConnectorCall }),
        input(
          {
            datasets: [
              {
                name: 'connector:drive-1',
                description: 'A team drive.',
                content: 'Files and folders.',
                access_patterns: [pattern],
                connector_access_patterns: [
                  call,
                  { ...call, sub_action: 'deleteFile' },
                  { ...call, params_example: 'nope' },
                ],
              },
            ],
          },
          { catalog: [drive] }
        )
      );

      expect(result.dropped_access_patterns).toBe(3);
      expect(verifyConnectorCall).toHaveBeenCalledWith('searchFiles', {
        query: "'ana@example.com' in owners",
      });
      const dataset = writtenById(datasetKiId('connector:drive-1'));
      expect(dataset?.attributes).toEqual(
        expect.objectContaining({
          'ontology.kind': 'connector',
          'ontology.connector_id': 'drive-1',
          'ontology.connector_access_patterns': [
            JSON.stringify({ ...call, connector_id: 'drive-1' }),
          ],
        })
      );
      expect(dataset?.attributes?.esql).toBeUndefined();
      expect(dataset?.attributes?.['ontology.join_fields']).toBeUndefined();
      expect(dataset?.content).toContain(
        '## Access patterns\n- [files of an owner] The files\n  Call: execute_connector_sub_action {"connectorId":"drive-1","subAction":"searchFiles"'
      );
    });
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

describe('removeOntologySource', () => {
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
    jest.mocked(softDeleteKi).mockImplementation(async (_client, { kiId }) => {
      stored.delete(kiId);
      return undefined as never;
    });
    jest.mocked(readOntologyKis).mockImplementation(async () => [...stored.values()]);
  });

  it("removes the source's datasets, their fields on terms, and its references", async () => {
    stored.set(datasetKiId('orders'), describedDataset('orders'));
    stored.set(datasetKiId('customers'), describedDataset('customers', [OTHER_SOURCE]));
    stored.set(
      termKiId('Customer'),
      customerTerm(['orders:customer_id', 'customers:id'], [SOURCE, OTHER_SOURCE])
    );
    stored.set(termKiId('Order'), {
      ...customerTerm(['orders:id'], [SOURCE]),
      id: termKiId('Order'),
      title: 'Order',
    });

    const result = await removeOntologySource(context());

    expect(stored.has(datasetKiId('orders'))).toBe(false);
    expect(stored.has(datasetKiId('customers'))).toBe(true);
    expect(stored.has(termKiId('Order'))).toBe(false);
    expect(stored.get(termKiId('Customer'))).toEqual(
      expect.objectContaining({
        attributes: expect.objectContaining({ 'ontology.fields': ['customers:id'] }),
        references: [{ uri: sourceUri(OTHER_SOURCE), relation: 'derived_from' }],
      })
    );
    expect(result).toEqual(expect.objectContaining({ deleted: 2, updated: 1 }));
  });
});

describe('parseTermField', () => {
  it('splits at the last colon, so connector and remote dataset names keep theirs', () => {
    expect(parseTermField('orders:customer_id')).toEqual({
      dataset: 'orders',
      field: 'customer_id',
    });
    expect(parseTermField('connector:drive-1:searchFiles.files.id')).toEqual({
      dataset: 'connector:drive-1',
      field: 'searchFiles.files.id',
    });
    expect(parseTermField('orders')).toBeUndefined();
    expect(parseTermField(':id')).toBeUndefined();
    expect(parseTermField('orders:')).toBeUndefined();
  });
});
