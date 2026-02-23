/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import type { Logger } from '@kbn/core/server';
import {
  fetchLiveQueryDetails,
  fetchLiveQueryResults,
  waitForQueryCompletion,
  waitForResultsCount,
} from './live_query_service';

// Mock the getActionResponses import
jest.mock('../routes/live_query/utils', () => ({
  getActionResponses: jest.fn(),
}));

import { getActionResponses } from '../routes/live_query/utils';

const mockGetActionResponses = getActionResponses as jest.MockedFunction<typeof getActionResponses>;

describe('live_query_service', () => {
  let mockSearch: jest.Mock;
  let mockScopedSearch: IScopedSearchClient;
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSearch = jest.fn();
    mockScopedSearch = {
      search: mockSearch,
    } as unknown as IScopedSearchClient;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as Logger;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('fetchLiveQueryDetails', () => {
    it('should fetch action details and return completed status when all agents responded', async () => {
      const mockActionDetails = {
        _source: {
          queries: [
            { action_id: 'query-1', id: 'q1', query: 'SELECT * FROM processes', agents: ['agent-1', 'agent-2'] },
          ],
        },
        fields: {
          expiration: [new Date(Date.now() + 60000).toISOString()], // Not expired
        },
      };

      mockSearch.mockReturnValue(of({ actionDetails: mockActionDetails }));

      mockGetActionResponses.mockReturnValue(
        of({
          action_id: 'query-1',
          docs: 10,
          failed: 0,
          pending: 0,
          responded: 2,
          successful: 2,
        })
      );

      const result = await fetchLiveQueryDetails(mockScopedSearch, {
        actionId: 'test-action',
        spaceId: 'default',
      });

      expect(result.isCompleted).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.status).toBe('completed');
      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].pending).toBe(0);
      expect(result.queries[0].status).toBe('completed');
    });

    it('should return running status when agents are still pending', async () => {
      const mockActionDetails = {
        _source: {
          queries: [
            { action_id: 'query-1', id: 'q1', query: 'SELECT * FROM processes', agents: ['agent-1', 'agent-2'] },
          ],
        },
        fields: {
          expiration: [new Date(Date.now() + 60000).toISOString()],
        },
      };

      mockSearch.mockReturnValue(of({ actionDetails: mockActionDetails }));

      mockGetActionResponses.mockReturnValue(
        of({
          action_id: 'query-1',
          docs: 5,
          failed: 0,
          pending: 1,
          responded: 1,
          successful: 1,
        })
      );

      const result = await fetchLiveQueryDetails(mockScopedSearch, {
        actionId: 'test-action',
        spaceId: 'default',
      });

      expect(result.isCompleted).toBe(false);
      expect(result.status).toBe('running');
      expect(result.queries[0].pending).toBe(1);
      expect(result.queries[0].status).toBe('running');
    });

    it('should return expired status when query has expired', async () => {
      const mockActionDetails = {
        _source: {
          queries: [
            { action_id: 'query-1', id: 'q1', query: 'SELECT * FROM processes', agents: ['agent-1'] },
          ],
        },
        fields: {
          expiration: [new Date(Date.now() - 60000).toISOString()], // Expired
        },
      };

      mockSearch.mockReturnValue(of({ actionDetails: mockActionDetails }));

      mockGetActionResponses.mockReturnValue(
        of({
          action_id: 'query-1',
          docs: 0,
          failed: 0,
          pending: 1,
          responded: 0,
          successful: 0,
        })
      );

      const result = await fetchLiveQueryDetails(mockScopedSearch, {
        actionId: 'test-action',
        spaceId: 'default',
      });

      expect(result.isExpired).toBe(true);
      expect(result.isCompleted).toBe(true);
      expect(result.status).toBe('expired');
    });

    it('should throw error when action is not found', async () => {
      mockSearch.mockReturnValue(of({ actionDetails: null }));

      await expect(
        fetchLiveQueryDetails(mockScopedSearch, {
          actionId: 'non-existent',
          spaceId: 'default',
        })
      ).rejects.toThrow('Action not found');
    });
  });

  describe('fetchLiveQueryResults', () => {
    it('should fetch results with pagination', async () => {
      const mockResults = {
        edges: [{ _source: { pid: 1, name: 'process1' } }],
        totalCount: 100,
      };

      mockSearch.mockReturnValue(of(mockResults));

      const result = await fetchLiveQueryResults(mockScopedSearch, {
        actionId: 'query-1',
        pagination: { page: 0, pageSize: 10 },
      });

      expect(result.data).toEqual(mockResults);
      expect(result.totalCount).toBe(100);
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'query-1',
          pagination: expect.objectContaining({
            activePage: 0,
            querySize: 10,
          }),
        }),
        expect.any(Object)
      );
    });

    it('should apply sort options', async () => {
      const mockResults = { edges: [], totalCount: 0 };
      mockSearch.mockReturnValue(of(mockResults));

      await fetchLiveQueryResults(mockScopedSearch, {
        actionId: 'query-1',
        pagination: { page: 0, pageSize: 10 },
        sort: { field: 'pid', direction: 'asc' },
      });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ field: 'pid', direction: 'asc' }],
        }),
        expect.any(Object)
      );
    });
  });

  describe('waitForQueryCompletion', () => {
    it('should return immediately when query is already completed', async () => {
      const mockActionDetails = {
        _source: {
          queries: [{ action_id: 'query-1', agents: ['agent-1'] }],
        },
        fields: {
          expiration: [new Date(Date.now() + 60000).toISOString()],
        },
      };

      mockSearch.mockReturnValue(of({ actionDetails: mockActionDetails }));

      mockGetActionResponses.mockReturnValue(
        of({
          action_id: 'query-1',
          docs: 10,
          failed: 0,
          pending: 0,
          responded: 1,
          successful: 1,
        })
      );

      const result = await waitForQueryCompletion(mockScopedSearch, {
        actionId: 'test-action',
        spaceId: 'default',
        logger: mockLogger,
      });

      expect(result.isCompleted).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should poll until query completes', async () => {
      const mockActionDetails = {
        _source: {
          queries: [{ action_id: 'query-1', agents: ['agent-1', 'agent-2'] }],
        },
        fields: {
          expiration: [new Date(Date.now() + 60000).toISOString()],
        },
      };

      mockSearch.mockReturnValue(of({ actionDetails: mockActionDetails }));

      // First call: pending
      // Second call: completed
      let callCount = 0;
      mockGetActionResponses.mockImplementation(() => {
        callCount++;
        return of({
          action_id: 'query-1',
          docs: callCount === 1 ? 5 : 10,
          failed: 0,
          pending: callCount === 1 ? 1 : 0,
          responded: callCount === 1 ? 1 : 2,
          successful: callCount === 1 ? 1 : 2,
        });
      });

      const resultPromise = waitForQueryCompletion(mockScopedSearch, {
        actionId: 'test-action',
        spaceId: 'default',
        pollIntervalMs: 100,
        maxWaitMs: 5000,
        logger: mockLogger,
      });

      // First poll - not complete, will schedule another
      await jest.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result.isCompleted).toBe(true);
      expect(callCount).toBe(2);
    });

    it('should timeout after maxWaitMs', async () => {
      const mockActionDetails = {
        _source: {
          queries: [{ action_id: 'query-1', agents: ['agent-1'] }],
        },
        fields: {
          expiration: [new Date(Date.now() + 600000).toISOString()], // Far future
        },
      };

      mockSearch.mockReturnValue(of({ actionDetails: mockActionDetails }));

      // Always pending
      mockGetActionResponses.mockReturnValue(
        of({
          action_id: 'query-1',
          docs: 0,
          failed: 0,
          pending: 1,
          responded: 0,
          successful: 0,
        })
      );

      const resultPromise = waitForQueryCompletion(mockScopedSearch, {
        actionId: 'test-action',
        spaceId: 'default',
        pollIntervalMs: 100,
        maxWaitMs: 500,
        logger: mockLogger,
      });

      // Advance past timeout
      await jest.advanceTimersByTimeAsync(600);

      const result = await resultPromise;

      expect(result.isCompleted).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Timeout'));
    });
  });

  describe('waitForResultsCount', () => {
    it('should return immediately when expected count is 0', async () => {
      const result = await waitForResultsCount(mockScopedSearch, {
        actionId: 'test-action',
        queryActionId: 'query-1',
        expectedCount: 0,
        spaceId: 'default',
        logger: mockLogger,
      });

      expect(result.matched).toBe(true);
      expect(result.totalCount).toBe(0);
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should return when count matches expected', async () => {
      mockSearch.mockReturnValue(of({ edges: [], totalCount: 10 }));

      const result = await waitForResultsCount(mockScopedSearch, {
        actionId: 'test-action',
        queryActionId: 'query-1',
        expectedCount: 10,
        spaceId: 'default',
        logger: mockLogger,
      });

      expect(result.matched).toBe(true);
      expect(result.totalCount).toBe(10);
    });

    it('should poll until count matches', async () => {
      let callCount = 0;
      mockSearch.mockImplementation(() => {
        callCount++;
        return of({ edges: [], totalCount: callCount === 1 ? 5 : 10 });
      });

      const resultPromise = waitForResultsCount(mockScopedSearch, {
        actionId: 'test-action',
        queryActionId: 'query-1',
        expectedCount: 10,
        spaceId: 'default',
        pollIntervalMs: 100,
        maxWaitMs: 5000,
        logger: mockLogger,
      });

      // Advance timer for polling
      await jest.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result.matched).toBe(true);
      expect(result.totalCount).toBe(10);
      expect(callCount).toBe(2);
    });

    it('should timeout when count never matches', async () => {
      mockSearch.mockReturnValue(of({ edges: [], totalCount: 5 }));

      const resultPromise = waitForResultsCount(mockScopedSearch, {
        actionId: 'test-action',
        queryActionId: 'query-1',
        expectedCount: 10,
        spaceId: 'default',
        pollIntervalMs: 100,
        maxWaitMs: 500,
        logger: mockLogger,
      });

      // Advance past timeout
      await jest.advanceTimersByTimeAsync(600);

      const result = await resultPromise;

      expect(result.matched).toBe(false);
      expect(result.totalCount).toBe(5);
    });
  });
});
