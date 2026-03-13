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
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns owner+space pairs from configure SOs with analytics_enabled: true', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [
        { namespaces: ['default'], attributes: { owner: 'securitySolution' } } as any,
        { namespaces: ['my-space'], attributes: { owner: 'observability' } } as any,
      ],
      total: 2,
      page: 1,
      per_page: 10000,
    });

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CASE_CONFIGURE_SAVED_OBJECT,
        namespaces: ['*'],
        filter: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.analytics_enabled: true`,
      })
    );
    expect(result).toEqual(
      expect.arrayContaining([
        { spaceId: 'default', owner: 'securitySolution' },
        { spaceId: 'my-space', owner: 'observability' },
      ])
    );
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no configure SOs have analytics enabled', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 10000,
    });

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toEqual([]);
  });

  it('deduplicates when the same owner+space appears in multiple SOs', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [
        { namespaces: ['default'], attributes: { owner: 'securitySolution' } } as any,
        { namespaces: ['default'], attributes: { owner: 'securitySolution' } } as any,
      ],
      total: 2,
      page: 1,
      per_page: 10000,
    });

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toEqual([{ spaceId: 'default', owner: 'securitySolution' }]);
  });

  it('does NOT deduplicate different owners in the same space', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [
        { namespaces: ['default'], attributes: { owner: 'securitySolution' } } as any,
        { namespaces: ['default'], attributes: { owner: 'observability' } } as any,
      ],
      total: 2,
      page: 1,
      per_page: 10000,
    });

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { spaceId: 'default', owner: 'securitySolution' },
        { spaceId: 'default', owner: 'observability' },
      ])
    );
  });

  it('excludes the wildcard namespace "*"', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [
        { namespaces: ['*', 'default'], attributes: { owner: 'securitySolution' } } as any,
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    });

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toEqual([{ spaceId: 'default', owner: 'securitySolution' }]);
  });

  it('excludes SOs with unknown owners', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [
        { namespaces: ['default'], attributes: { owner: 'securitySolutionFixture' } } as any,
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    });

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toEqual([]);
  });

  it('handles SOs with no namespaces', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [{ namespaces: undefined, attributes: { owner: 'securitySolution' } } as any],
      total: 1,
      page: 1,
      per_page: 10000,
    });

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toEqual([]);
  });
});
