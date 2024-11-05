/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

import { getHistoricalResultStub } from '../../../../stub/get_historical_result_stub';
import { useStoredPatternResults } from '.';

describe('useStoredPatternResults', () => {
  const httpFetch = jest.fn();
  const mockToasts = notificationServiceMock.createStartContract().toasts;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when patterns are empty', () => {
    it('should return an empty array and not call getStorageResults', () => {
      const { result } = renderHook(() => useStoredPatternResults([], mockToasts, httpFetch));

      expect(result.current).toEqual([]);
      expect(httpFetch).not.toHaveBeenCalled();
    });
  });

  describe('when patterns are provided', () => {
    it('should fetch and return stored pattern results correctly', async () => {
      const patterns = ['pattern1-*', 'pattern2-*'];

      httpFetch.mockImplementation((path: string) => {
        if (path === '/internal/ecs_data_quality_dashboard/results_latest/pattern1-*') {
          return Promise.resolve([getHistoricalResultStub('pattern1-index1')]);
        }

        if (path === '/internal/ecs_data_quality_dashboard/results_latest/pattern2-*') {
          return Promise.resolve([getHistoricalResultStub('pattern2-index1')]);
        }

        return Promise.reject(new Error('Invalid path'));
      });

      const { result, waitFor } = renderHook(() =>
        useStoredPatternResults(patterns, mockToasts, httpFetch)
      );

      await waitFor(() => result.current.length > 0);

      expect(httpFetch).toHaveBeenCalledTimes(2);

      expect(httpFetch).toHaveBeenCalledWith(
        '/internal/ecs_data_quality_dashboard/results_latest/pattern1-*',
        {
          method: 'GET',
          signal: expect.any(AbortSignal),
          version: '1',
        }
      );
      expect(httpFetch).toHaveBeenCalledWith(
        '/internal/ecs_data_quality_dashboard/results_latest/pattern2-*',
        {
          method: 'GET',
          signal: expect.any(AbortSignal),
          version: '1',
        }
      );

      expect(result.current).toEqual([
        {
          pattern: 'pattern1-*',
          results: {
            'pattern1-index1': {
              docsCount: expect.any(Number),
              error: null,
              ilmPhase: expect.any(String),
              incompatible: expect.any(Number),
              indexName: 'pattern1-index1',
              pattern: 'pattern1-*',
              markdownComments: expect.any(Array),
              sameFamily: expect.any(Number),
              checkedAt: expect.any(Number),
            },
          },
        },
        {
          pattern: 'pattern2-*',
          results: {
            'pattern2-index1': {
              docsCount: expect.any(Number),
              error: null,
              ilmPhase: expect.any(String),
              incompatible: expect.any(Number),
              indexName: 'pattern2-index1',
              pattern: 'pattern2-*',
              markdownComments: expect.any(Array),
              sameFamily: expect.any(Number),
              checkedAt: expect.any(Number),
            },
          },
        },
      ]);
    });
  });
});
