/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, savedObjectsTypeRegistryMock } from '@kbn/core/server/mocks';
import { createReference, createTagReference } from '../../../common/test_utils';
import { computeAffectedCount, findAffectedObjects, rewriteTagReferences } from './queries';

describe('computeAffectedCount', () => {
  let client: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    client = savedObjectsClientMock.create();
  });

  it('sums the per-type totals into the overall affected count', async () => {
    client.find.mockImplementation(({ type }) =>
      Promise.resolve({
        saved_objects: [],
        page: 1,
        per_page: 0,
        total: type === 'dashboard' ? 5 : 2,
      })
    );

    const result = await computeAffectedCount(client, {
      fromIds: ['from-1', 'from-2'],
      types: ['dashboard', 'map'],
    });

    expect(result).toEqual({ affectedCount: 7, byType: { dashboard: 5, map: 2 } });
  });

  it('queries each type with an OR over all `fromIds` references', async () => {
    client.find.mockResolvedValue({ saved_objects: [], page: 1, per_page: 0, total: 0 });

    await computeAffectedCount(client, { fromIds: ['from-1', 'from-2'], types: ['dashboard'] });

    expect(client.find).toHaveBeenCalledWith({
      type: 'dashboard',
      hasReference: [createTagReference('from-1'), createTagReference('from-2')],
      hasReferenceOperator: 'OR',
      perPage: 0,
    });
  });

  it('returns zero when no type has any matches', async () => {
    client.find.mockResolvedValue({ saved_objects: [], page: 1, per_page: 0, total: 0 });

    const result = await computeAffectedCount(client, {
      fromIds: ['from-1'],
      types: ['dashboard'],
    });

    expect(result).toEqual({ affectedCount: 0, byType: { dashboard: 0 } });
  });
});

describe('findAffectedObjects', () => {
  let client: ReturnType<typeof savedObjectsClientMock.create>;
  let typeRegistry: ReturnType<typeof savedObjectsTypeRegistryMock.create>;

  beforeEach(() => {
    client = savedObjectsClientMock.create();
    typeRegistry = savedObjectsTypeRegistryMock.create();
  });

  it('passes pagination params through to the client and maps the results', async () => {
    typeRegistry.getType.mockReturnValue({
      management: { getTitle: (obj: any) => `title-${obj.id}` },
    } as any);
    client.find.mockResolvedValue({
      saved_objects: [
        { id: 'obj-1', type: 'dashboard', references: [], attributes: {}, score: 0 },
        { id: 'obj-2', type: 'map', references: [], attributes: {}, score: 0 },
      ],
      total: 42,
      page: 3,
      per_page: 5,
    });

    const result = await findAffectedObjects(client, typeRegistry, {
      fromIds: ['from-1'],
      types: ['dashboard', 'map'],
      page: 3,
      perPage: 5,
    });

    expect(client.find).toHaveBeenCalledWith({
      type: ['dashboard', 'map'],
      hasReference: [createTagReference('from-1')],
      hasReferenceOperator: 'OR',
      page: 3,
      perPage: 5,
    });
    expect(result).toEqual({
      total: 42,
      objects: [
        { id: 'obj-1', type: 'dashboard', title: 'title-obj-1' },
        { id: 'obj-2', type: 'map', title: 'title-obj-2' },
      ],
    });
  });

  it('omits `title` when the type has no title getter registered', async () => {
    typeRegistry.getType.mockReturnValue(undefined);
    client.find.mockResolvedValue({
      saved_objects: [{ id: 'obj-1', type: 'dashboard', references: [], attributes: {}, score: 0 }],
      total: 1,
      page: 1,
      per_page: 20,
    });

    const result = await findAffectedObjects(client, typeRegistry, {
      fromIds: ['from-1'],
      types: ['dashboard'],
      page: 1,
      perPage: 20,
    });

    expect(result.objects).toEqual([{ id: 'obj-1', type: 'dashboard', title: undefined }]);
  });
});

describe('rewriteTagReferences', () => {
  it('replaces all `fromIds` references with `toId`, leaving non-tag references untouched', () => {
    const objects = [
      {
        id: 'obj-1',
        type: 'dashboard',
        references: [
          createReference('dashboard', 'other-dash'),
          createTagReference('from-1'),
          createTagReference('from-2'),
        ],
      },
    ];

    const result = rewriteTagReferences(objects, { toId: 'to-1', fromIds: ['from-1', 'from-2'] });

    expect(result).toEqual([
      {
        id: 'obj-1',
        type: 'dashboard',
        attributes: {},
        references: [createReference('dashboard', 'other-dash'), createTagReference('to-1')],
      },
    ]);
  });

  it('dedupes when the object already references `toId` alongside a `fromId`', () => {
    const objects = [
      {
        id: 'obj-1',
        type: 'dashboard',
        references: [createTagReference('to-1'), createTagReference('from-1')],
      },
    ];

    const result = rewriteTagReferences(objects, { toId: 'to-1', fromIds: ['from-1'] });

    expect(result[0].references).toEqual([createTagReference('to-1')]);
  });

  it('leaves objects with no matching tag references unchanged beyond the empty attributes', () => {
    const objects = [
      { id: 'obj-1', type: 'dashboard', references: [createReference('dashboard', 'other')] },
    ];

    const result = rewriteTagReferences(objects, { toId: 'to-1', fromIds: ['from-1'] });

    expect(result[0].references).toEqual([
      createReference('dashboard', 'other'),
      createTagReference('to-1'),
    ]);
  });
});
