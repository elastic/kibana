/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTIONS_INDEX } from '../../common/constants';
import { findOsqueryActionMetadata } from './find_osquery_action_metadata';

describe('findOsqueryActionMetadata', () => {
  const mockSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when a parent action_id matches in the active space', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [{ _id: 'doc-1' }] } });

    const result = await findOsqueryActionMetadata({
      esClient: { search: mockSearch } as never,
      spaceId: 'default',
      actionId: 'parent-action',
      actionsIndexExists: true,
    });

    expect(result).toBe(true);
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        index: `${ACTIONS_INDEX}*`,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            should: expect.arrayContaining([{ term: { action_id: 'parent-action' } }]),
          }),
        }),
      })
    );
  });

  it('returns true when a sub-action queries.action_id matches', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [{ _id: 'doc-1' }] } });

    const result = await findOsqueryActionMetadata({
      esClient: { search: mockSearch } as never,
      spaceId: 'my-space',
      actionId: 'sub-action-id',
      actionsIndexExists: true,
    });

    expect(result).toBe(true);
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            should: expect.arrayContaining([{ term: { 'queries.action_id': 'sub-action-id' } }]),
          }),
        }),
      })
    );
  });

  it('returns false when no metadata document matches via fleet fallback', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [] } });

    const result = await findOsqueryActionMetadata({
      esClient: { search: mockSearch } as never,
      spaceId: 'default',
      actionId: 'unknown-action',
      actionsIndexExists: false,
      allowFleetFallback: true,
    });

    expect(result).toBe(false);
    expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ index: '.fleet-actions' }));
  });

  it('queries the osquery actions index when fleet fallback is disabled', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [{ _id: 'doc-1' }] } });

    const result = await findOsqueryActionMetadata({
      esClient: { search: mockSearch } as never,
      spaceId: 'default',
      actionId: 'linked-project-action',
      actionsIndexExists: false,
    });

    expect(result).toBe(true);
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        index: `${ACTIONS_INDEX}*`,
        allow_no_indices: true,
        ignore_unavailable: true,
      })
    );
  });
});
