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
        { namespaces: ['default'], attributes: { owner: 'securitySolution' } },
        { namespaces: ['my-space'], attributes: { owner: 'observability' } },
      ],
      total: 2,
      page: 1,
      per_page: 10000,
    } as unknown as Awaited<ReturnType<typeof soClient.find>>);

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
        { namespaces: ['default'], attributes: { owner: 'securitySolution' } },
        { namespaces: ['default'], attributes: { owner: 'securitySolution' } },
      ],
      total: 2,
      page: 1,
      per_page: 10000,
    } as unknown as Awaited<ReturnType<typeof soClient.find>>);

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toEqual([{ spaceId: 'default', owner: 'securitySolution' }]);
  });

  it('does NOT deduplicate different owners in the same space', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [
        { namespaces: ['default'], attributes: { owner: 'securitySolution' } },
        { namespaces: ['default'], attributes: { owner: 'observability' } },
      ],
      total: 2,
      page: 1,
      per_page: 10000,
    } as unknown as Awaited<ReturnType<typeof soClient.find>>);

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
      saved_objects: [{ namespaces: ['*', 'default'], attributes: { owner: 'securitySolution' } }],
      total: 1,
      page: 1,
      per_page: 10000,
    } as unknown as Awaited<ReturnType<typeof soClient.find>>);

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toEqual([{ spaceId: 'default', owner: 'securitySolution' }]);
  });

  it('excludes SOs with unknown owners', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [
        { namespaces: ['default'], attributes: { owner: 'securitySolutionFixture' } },
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    } as unknown as Awaited<ReturnType<typeof soClient.find>>);

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toEqual([]);
  });

  it('handles SOs with no namespaces', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [{ namespaces: undefined, attributes: { owner: 'securitySolution' } }],
      total: 1,
      page: 1,
      per_page: 10000,
    } as unknown as Awaited<ReturnType<typeof soClient.find>>);

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toEqual([]);
  });

  // ── Pagination ──────────────────────────────────────────────────────────────

  it('paginates when the first page is full (perPage results returned)', async () => {
    // Page 1: exactly 10 000 results (full page) → must fetch page 2
    const page1SOs = Array.from({ length: 10000 }, (_, i) => ({
      namespaces: [`space-${i}`],
      attributes: { owner: 'securitySolution' },
    }));
    // Page 2: 1 result → last page
    const page2SOs = [{ namespaces: ['space-extra'], attributes: { owner: 'securitySolution' } }];

    soClient.find
      .mockResolvedValueOnce({
        saved_objects: page1SOs,
        total: 10001,
        page: 1,
        per_page: 10000,
      } as unknown as Awaited<ReturnType<typeof soClient.find>>)
      .mockResolvedValueOnce({
        saved_objects: page2SOs,
        total: 10001,
        page: 2,
        per_page: 10000,
      } as unknown as Awaited<ReturnType<typeof soClient.find>>);

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    // Both pages must be requested
    expect(soClient.find).toHaveBeenCalledTimes(2);
    expect(soClient.find).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1 }));
    expect(soClient.find).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }));

    // All 10 001 distinct pairs must be present
    expect(result).toHaveLength(10001);
    expect(result).toEqual(
      expect.arrayContaining([
        { spaceId: 'space-0', owner: 'securitySolution' },
        { spaceId: 'space-extra', owner: 'securitySolution' },
      ])
    );
  });

  it('stops at the first page when fewer than perPage results are returned', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [{ namespaces: ['default'], attributes: { owner: 'securitySolution' } }],
      total: 1,
      page: 1,
      per_page: 10000,
    } as unknown as Awaited<ReturnType<typeof soClient.find>>);

    await getSpacesWithAnalyticsEnabled(soClient);

    // Only one page should be fetched
    expect(soClient.find).toHaveBeenCalledTimes(1);
  });

  it('deduplicates across pages', async () => {
    // Both pages contain the same owner+space — result must have only one entry
    const duplicateSO = { namespaces: ['default'], attributes: { owner: 'securitySolution' } };

    soClient.find
      .mockResolvedValueOnce({
        saved_objects: Array.from({ length: 10000 }, () => duplicateSO),
        total: 10001,
        page: 1,
        per_page: 10000,
      } as unknown as Awaited<ReturnType<typeof soClient.find>>)
      .mockResolvedValueOnce({
        saved_objects: [duplicateSO],
        total: 10001,
        page: 2,
        per_page: 10000,
      } as unknown as Awaited<ReturnType<typeof soClient.find>>);

    const result = await getSpacesWithAnalyticsEnabled(soClient);

    expect(result).toEqual([{ spaceId: 'default', owner: 'securitySolution' }]);
  });
});
