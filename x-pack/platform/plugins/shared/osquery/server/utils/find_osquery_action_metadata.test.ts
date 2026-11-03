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

  it('returns false when no metadata document matches', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [] } });

    const result = await findOsqueryActionMetadata({
      esClient: { search: mockSearch } as never,
      spaceId: 'default',
      actionId: 'unknown-action',
      actionsIndexExists: false,
    });

    expect(result).toBe(false);
  });

  it('never reads a fleet index, which the end-user client cannot access under CPS', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [] } });

    await findOsqueryActionMetadata({
      esClient: { search: mockSearch } as never,
      spaceId: 'default',
      actionId: 'unknown-action',
      actionsIndexExists: false,
    });

    expect(mockSearch).not.toHaveBeenCalledWith(
      expect.objectContaining({ index: expect.stringContaining('fleet') })
    );
  });

  it('scopes the lookup to the active space', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [] } });

    await findOsqueryActionMetadata({
      esClient: { search: mockSearch } as never,
      spaceId: 'my-space',
      actionId: 'some-action',
      actionsIndexExists: true,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ term: { space_id: 'my-space' } }]),
          }),
        }),
      })
    );
  });

  it('queries the osquery actions index tolerantly when it does not exist locally', async () => {
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

  it('matches action documents with no space_id in the default space', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [] } });

    await findOsqueryActionMetadata({
      esClient: { search: mockSearch } as never,
      spaceId: 'default',
      actionId: 'pre-space-awareness-action',
      actionsIndexExists: true,
    });

    expect(mockSearch.mock.calls[0][0].query.bool.filter).toContainEqual({
      bool: {
        should: [
          { term: { space_id: 'default' } },
          { bool: { must_not: { exists: { field: 'space_id' } } } },
        ],
      },
    });
  });

  it('reads only the action ids from the matched document', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [] } });

    await findOsqueryActionMetadata({
      esClient: { search: mockSearch } as never,
      spaceId: 'default',
      actionId: 'some-action',
      actionsIndexExists: true,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ _source: ['action_id', 'queries.action_id'] })
    );
  });

  describe('per-request memoization', () => {
    const packHit = {
      hits: {
        hits: [
          {
            _id: 'doc-1',
            _source: {
              action_id: 'parent',
              queries: [{ action_id: 'query-1' }, { action_id: 'query-2' }],
            },
          },
        ],
      },
    };

    const lookup = (request: object, actionId: string, spaceId = 'my-space') =>
      findOsqueryActionMetadata({
        esClient: { search: mockSearch } as never,
        spaceId,
        actionId,
        actionsIndexExists: true,
        request: request as never,
      });

    it('verifies every id on the matched document with one lookup', async () => {
      mockSearch.mockResolvedValue(packHit);
      const request = {};

      expect(await lookup(request, 'query-1')).toBe(true);
      expect(await lookup(request, 'query-2')).toBe(true);
      expect(await lookup(request, 'parent')).toBe(true);
      expect(mockSearch).toHaveBeenCalledTimes(1);
    });

    it('lets concurrent lookups for sibling ids share the first search', async () => {
      mockSearch.mockResolvedValue(packHit);
      const request = {};

      const results = await Promise.all([
        lookup(request, 'query-1'),
        lookup(request, 'query-2'),
        lookup(request, 'parent'),
      ]);

      expect(results).toEqual([true, true, true]);
      expect(mockSearch).toHaveBeenCalledTimes(1);
    });

    it('never caches a miss', async () => {
      mockSearch.mockResolvedValue({ hits: { hits: [] } });
      const request = {};

      expect(await lookup(request, 'unknown')).toBe(false);
      expect(await lookup(request, 'unknown')).toBe(false);
      expect(mockSearch).toHaveBeenCalledTimes(2);
    });

    it('does not share verification across requests or spaces', async () => {
      mockSearch.mockResolvedValue(packHit);
      const request = {};

      await lookup(request, 'query-1');
      await lookup({}, 'query-1');
      await lookup(request, 'query-1', 'other-space');

      expect(mockSearch).toHaveBeenCalledTimes(3);
    });

    it('looks up an id the pending search did not cover', async () => {
      mockSearch.mockResolvedValueOnce(packHit).mockResolvedValueOnce({ hits: { hits: [] } });
      const request = {};

      const [sibling, unrelated] = await Promise.all([
        lookup(request, 'query-1'),
        lookup(request, 'other-action'),
      ]);

      expect(sibling).toBe(true);
      expect(unrelated).toBe(false);
      expect(mockSearch).toHaveBeenCalledTimes(2);
    });

    it('propagates a failed lookup instead of treating it as verified', async () => {
      mockSearch.mockRejectedValueOnce(new Error('forbidden'));
      const request = {};

      await expect(lookup(request, 'query-1')).rejects.toThrow('forbidden');

      mockSearch.mockResolvedValueOnce({ hits: { hits: [] } });
      expect(await lookup(request, 'query-1')).toBe(false);
    });
  });
});
