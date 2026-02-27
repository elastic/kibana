/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CASE_CONFIGURE_SAVED_OBJECT } from '../../common/constants';
import { getSpacesWithAnalyticsEnabled } from './utils';

describe('getSpacesWithAnalyticsEnabled', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when no configure SOs have analytics_enabled', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 10000,
      page: 1,
    });

    const result = await getSpacesWithAnalyticsEnabled(savedObjectsClient);
    expect(result).toEqual([]);
  });

  it('queries for configure SOs with analytics_enabled: true across all namespaces', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 10000,
      page: 1,
    });

    await getSpacesWithAnalyticsEnabled(savedObjectsClient);

    expect(savedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CASE_CONFIGURE_SAVED_OBJECT,
        namespaces: ['*'],
      })
    );
  });

  it('returns {spaceId, owner} pairs from matching configure SOs', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          score: 1,
          id: 'config-1',
          type: CASE_CONFIGURE_SAVED_OBJECT,
          attributes: { analytics_enabled: true, owner: 'securitySolution' },
          references: [],
          namespaces: ['default'],
        },
        {
          score: 1,
          id: 'config-2',
          type: CASE_CONFIGURE_SAVED_OBJECT,
          attributes: { analytics_enabled: true, owner: 'observability' },
          references: [],
          namespaces: ['my-space'],
        },
      ],
      total: 2,
      per_page: 10000,
      page: 1,
    });

    const result = await getSpacesWithAnalyticsEnabled(savedObjectsClient);
    expect(result).toEqual(
      expect.arrayContaining([
        { spaceId: 'default', owner: 'securitySolution' },
        { spaceId: 'my-space', owner: 'observability' },
      ])
    );
    expect(result).toHaveLength(2);
  });

  it('produces separate entries for different owners in the same space', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          score: 1,
          id: 'config-1',
          type: CASE_CONFIGURE_SAVED_OBJECT,
          attributes: { analytics_enabled: true, owner: 'securitySolution' },
          references: [],
          namespaces: ['default'],
        },
        {
          score: 1,
          id: 'config-2',
          type: CASE_CONFIGURE_SAVED_OBJECT,
          attributes: { analytics_enabled: true, owner: 'observability' },
          references: [],
          namespaces: ['default'],
        },
      ],
      total: 2,
      per_page: 10000,
      page: 1,
    });

    const result = await getSpacesWithAnalyticsEnabled(savedObjectsClient);
    expect(result).toEqual(
      expect.arrayContaining([
        { spaceId: 'default', owner: 'securitySolution' },
        { spaceId: 'default', owner: 'observability' },
      ])
    );
    expect(result).toHaveLength(2);
  });

  it('deduplicates entries with the same spaceId and owner', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          score: 1,
          id: 'config-1',
          type: CASE_CONFIGURE_SAVED_OBJECT,
          attributes: { analytics_enabled: true, owner: 'securitySolution' },
          references: [],
          namespaces: ['default'],
        },
        {
          score: 1,
          id: 'config-2',
          type: CASE_CONFIGURE_SAVED_OBJECT,
          attributes: { analytics_enabled: true, owner: 'securitySolution' },
          references: [],
          namespaces: ['default'],
        },
      ],
      total: 2,
      per_page: 10000,
      page: 1,
    });

    const result = await getSpacesWithAnalyticsEnabled(savedObjectsClient);
    expect(result).toEqual([{ spaceId: 'default', owner: 'securitySolution' }]);
  });

  it('filters out SOs with an unrecognised owner', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          score: 1,
          id: 'config-1',
          type: CASE_CONFIGURE_SAVED_OBJECT,
          attributes: { analytics_enabled: true, owner: 'unknownPlugin' },
          references: [],
          namespaces: ['default'],
        },
      ],
      total: 1,
      per_page: 10000,
      page: 1,
    });

    const result = await getSpacesWithAnalyticsEnabled(savedObjectsClient);
    expect(result).toEqual([]);
  });

  it('handles SOs with no namespaces gracefully', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          score: 1,
          id: 'config-1',
          type: CASE_CONFIGURE_SAVED_OBJECT,
          attributes: { analytics_enabled: true, owner: 'securitySolution' },
          references: [],
          // namespaces is undefined
        },
      ],
      total: 1,
      per_page: 10000,
      page: 1,
    });

    const result = await getSpacesWithAnalyticsEnabled(savedObjectsClient);
    expect(result).toEqual([]);
  });
});
