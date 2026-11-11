/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMockArgs } from '../mocks';
import {
  buildObservableAttachmentAttributes,
  createCaseObservables,
  deriveObservableId,
  findCaseObservables,
  getObservablesSummary,
  toObservable,
  updateCaseObservable,
  withObservablesSummary,
} from './observables_storage';

const rawObservable = (id: string, value: string) => ({
  _id: `cases-attachments:${id}`,
  _source: {},
  sort: ['2026-11-04T00:00:00.000Z', 'observable-type-ipv4', value],
});

const savedObject = (id: string, value: string) => ({
  id,
  type: 'cases-attachments',
  references: [],
  attributes: {
    type: 'observable',
    owner: 'securitySolution',
    data: { typeKey: 'observable-type-ipv4', value, description: null },
    created_at: '2026-11-04T00:00:00.000Z',
  },
});

describe('observables storage', () => {
  const clientArgs = createCasesClientMockArgs();
  const { unsecuredSavedObjectsClient, savedObjectsSerializer } = clientArgs;

  beforeEach(() => {
    jest.clearAllMocks();
    savedObjectsSerializer.rawToSavedObject.mockImplementation(((raw: { _id: string }) => {
      const id = raw._id.split(':').pop() ?? '';
      return savedObject(id, `value-${id}`);
    }) as never);
  });

  describe('deriveObservableId', () => {
    it('returns the same id for the same case, type key and value', () => {
      const args = { caseId: 'case-1', typeKey: 'observable-type-ipv4', value: '10.0.0.1' };

      expect(deriveObservableId(args)).toEqual(deriveObservableId({ ...args }));
      expect(deriveObservableId(args)).toHaveLength(36);
    });

    it('returns different ids when any part differs', () => {
      const base = { caseId: 'case-1', typeKey: 'observable-type-ipv4', value: '10.0.0.1' };
      const ids = new Set([
        deriveObservableId(base),
        deriveObservableId({ ...base, caseId: 'case-2' }),
        deriveObservableId({ ...base, typeKey: 'observable-type-ipv6' }),
        deriveObservableId({ ...base, value: '10.0.0.2' }),
      ]);

      expect(ids.size).toBe(4);
    });

    it('does not collide when a separator appears inside a part', () => {
      expect(deriveObservableId({ caseId: 'a', typeKey: 'b-c', value: 'd' })).not.toEqual(
        deriveObservableId({ caseId: 'a', typeKey: 'b', value: 'c-d' })
      );
    });
  });

  describe('findCaseObservables', () => {
    const search = unsecuredSavedObjectsClient.search as jest.Mock;

    beforeEach(() => {
      search.mockResolvedValue({
        hits: { total: { value: 3 }, hits: [rawObservable('a', '1'), rawObservable('b', '2')] },
      });
    });

    it('filters by case, type key and value and sorts with type key and value tie-breakers', async () => {
      await findCaseObservables(
        {
          caseId: 'case-1',
          perPage: 2,
          sortField: 'createdAt',
          sortOrder: 'desc',
          typeKeys: ['observable-type-ipv4'],
          search: '10.*',
        },
        clientArgs
      );

      const [options]: Parameters<typeof unsecuredSavedObjectsClient.search> = search.mock.calls[0];
      expect(options).toMatchObject({
        type: 'cases-attachments',
        namespaces: ['default'],
        size: 2,
        track_total_hits: true,
        sort: [
          { 'cases-attachments.created_at': { order: 'desc' } },
          { 'cases-attachments.data.typeKey': { order: 'asc' } },
          { 'cases-attachments.data.value': { order: 'asc' } },
        ],
      });
      expect(JSON.stringify(options.query)).toContain('"references.id":"case-1"');
      expect(JSON.stringify(options.query)).toContain(
        '"terms":{"cases-attachments.data.typeKey":["observable-type-ipv4"]}'
      );
      expect(options.query).toEqual(
        expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              {
                wildcard: {
                  'cases-attachments.data.value': {
                    value: '*10.\\**',
                    case_insensitive: true,
                  },
                },
              },
            ]),
          }),
        })
      );
    });

    it('does not repeat the sort field as a tie-breaker', async () => {
      await findCaseObservables(
        { caseId: 'case-1', perPage: 2, sortField: 'value', sortOrder: 'asc' },
        clientArgs
      );

      expect(search.mock.calls[0][0].sort).toEqual([
        { 'cases-attachments.data.value': { order: 'asc' } },
        { 'cases-attachments.data.typeKey': { order: 'asc' } },
      ]);
    });

    it('returns a cursor for a full page and resumes from it', async () => {
      const firstPage = await findCaseObservables(
        { caseId: 'case-1', perPage: 2, sortField: 'createdAt', sortOrder: 'asc' },
        clientArgs
      );

      expect(firstPage.total).toBe(3);
      expect(firstPage.observables.map(({ id }) => id)).toEqual(['a', 'b']);
      expect(firstPage.cursor).toBeDefined();

      await findCaseObservables(
        {
          caseId: 'case-1',
          perPage: 2,
          sortField: 'createdAt',
          sortOrder: 'asc',
          cursor: firstPage.cursor,
        },
        clientArgs
      );

      expect(search.mock.calls[1][0].search_after).toEqual(rawObservable('b', '2').sort);
    });

    it('returns no cursor for the last page', async () => {
      const page = await findCaseObservables(
        { caseId: 'case-1', perPage: 5, sortField: 'createdAt', sortOrder: 'asc' },
        clientArgs
      );

      expect(page.cursor).toBeUndefined();
    });

    it('rejects a cursor it did not issue', async () => {
      await expect(
        findCaseObservables(
          {
            caseId: 'case-1',
            perPage: 2,
            sortField: 'createdAt',
            sortOrder: 'asc',
            cursor: Buffer.from('{"a":1}').toString('base64'),
          },
          clientArgs
        )
      ).rejects.toThrow('Invalid observables cursor');
    });
  });

  describe('getObservablesSummary', () => {
    it('returns the total and preview of each case from one aggregation', async () => {
      (unsecuredSavedObjectsClient.find as jest.Mock).mockResolvedValue({
        total: 0,
        saved_objects: [],
        aggregations: {
          refs: {
            caseIds: {
              buckets: [
                {
                  key: 'case-1',
                  reverse: {
                    doc_count: 100000,
                    preview: { hits: { hits: [rawObservable('a', '1')] } },
                  },
                },
              ],
            },
          },
        },
      });

      const summaries = await getObservablesSummary(['case-1', 'case-2'], clientArgs);

      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
      expect(summaries.get('case-1')).toEqual({
        total: 100000,
        preview: [
          {
            id: 'a',
            typeKey: 'observable-type-ipv4',
            value: 'value-a',
            description: null,
            createdAt: '2026-11-04T00:00:00.000Z',
            updatedAt: null,
          },
        ],
      });
      expect(summaries.has('case-2')).toBe(false);
    });

    it('leaves the metadata out of the preview', async () => {
      (unsecuredSavedObjectsClient.find as jest.Mock).mockResolvedValue({
        total: 0,
        saved_objects: [],
        aggregations: { refs: { caseIds: { buckets: [] } } },
      });

      await getObservablesSummary(['case-1'], clientArgs);

      const { aggs } = (unsecuredSavedObjectsClient.find as jest.Mock).mock.calls[0][0];
      const { _source: source } =
        aggs.refs.aggregations.caseIds.aggregations.reverse.aggregations.preview.top_hits;
      expect(source).toEqual(expect.arrayContaining(['type', 'cases-attachments.data.value']));
      expect(source).not.toContain('cases-attachments.data.metadata');
    });

    it('does not query when there are no cases', async () => {
      expect((await getObservablesSummary([], clientArgs)).size).toBe(0);
      expect(unsecuredSavedObjectsClient.find).not.toHaveBeenCalled();
    });
  });

  describe('withObservablesSummary', () => {
    it('replaces the case field with the stored preview and total', () => {
      const summaries = new Map([['case-1', { total: 7, preview: [] }]]);

      expect(
        withObservablesSummary({ id: 'case-1', observables: [], total_observables: 0 }, summaries)
      ).toEqual({ id: 'case-1', observables: [], total_observables: 7 });
    });

    it('reports zero for a case with no stored observables', () => {
      expect(
        withObservablesSummary({ id: 'case-2', observables: [], total_observables: 3 }, new Map())
      ).toEqual({ id: 'case-2', observables: [], total_observables: 0 });
    });
  });

  describe('metadata', () => {
    const metadata = { verdict: 'malicious', virustotal: 'https://www.virustotal.com/gui/ip/1' };

    it('maps the stored metadata to the observable and leaves it out when there is none', () => {
      const so = savedObject('a', '10.0.0.1');
      expect(
        toObservable({
          ...so,
          attributes: { ...so.attributes, data: { ...so.attributes.data, metadata } },
        } as never).metadata
      ).toEqual(metadata);
      expect(toObservable(so as never)).not.toHaveProperty('metadata');
      expect(
        toObservable({
          ...so,
          attributes: { ...so.attributes, data: { ...so.attributes.data, metadata: null } },
        } as never)
      ).not.toHaveProperty('metadata');
    });

    it('stores the metadata of a new observable', () => {
      const attributes = buildObservableAttachmentAttributes({
        observable: {
          typeKey: 'observable-type-ipv4',
          value: '10.0.0.1',
          description: null,
          metadata,
        },
        owner: 'securitySolution',
        createdAt: '2026-11-05T00:00:00.000Z',
        createdBy: { username: 'elastic', full_name: null, email: null },
      });

      expect(attributes.data).toEqual({
        typeKey: 'observable-type-ipv4',
        value: '10.0.0.1',
        description: null,
        metadata,
      });
    });

    it('creates observables with their metadata and returns it', async () => {
      (unsecuredSavedObjectsClient.bulkCreate as jest.Mock).mockImplementation(
        async (objects: Array<{ id: string }>) => ({
          saved_objects: objects.map(({ id }) => ({ id, type: 'cases-attachments' })),
        })
      );

      const { added } = await createCaseObservables({
        caseId: 'case-1',
        owner: 'securitySolution',
        observables: [
          { typeKey: 'observable-type-ipv4', value: '10.0.0.1', description: null, metadata },
          { typeKey: 'observable-type-ipv4', value: '10.0.0.2', description: null },
        ],
        clientArgs,
      });

      const [objects] = (unsecuredSavedObjectsClient.bulkCreate as jest.Mock).mock.calls[0];
      expect(objects[0].attributes.data.metadata).toEqual(metadata);
      expect(objects[1].attributes.data).not.toHaveProperty('metadata');
      expect(added[0].metadata).toEqual(metadata);
      expect(added[1]).not.toHaveProperty('metadata');
    });

    it.each([
      ['replaces', metadata],
      ['clears', null],
    ])('%s the metadata in a partial update', async (_, next) => {
      await updateCaseObservable(
        'a',
        { typeKey: 'observable-type-ipv4', value: '10.0.0.1', description: null, metadata: next },
        clientArgs
      );

      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
        'cases-attachments',
        'a',
        expect.objectContaining({ data: expect.objectContaining({ metadata: next }) }),
        { refresh: 'wait_for' }
      );
    });
  });
});
