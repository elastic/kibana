/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { DataQualityProvider } from '../data_quality_panel/data_quality_context';
import { mockStatsGreenIndex } from '../mock/stats/mock_stats_green_index';
import { ERROR_LOADING_STATS } from '../translations';
import { useStats } from '.';

const mockHttpFetch = jest.fn();
const ContextWrapper: React.FC = ({ children }) => (
  <DataQualityProvider httpFetch={mockHttpFetch}>{children}</DataQualityProvider>
);

const pattern = 'auditbeat-*';

describe('useStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    beforeEach(() => {
      mockHttpFetch.mockResolvedValue(mockStatsGreenIndex);
    });

    test('it returns the expected stats', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useStats(pattern), {
        wrapper: ContextWrapper,
      });
      await waitForNextUpdate();
      const { stats } = await result.current;

      expect(stats).toEqual(mockStatsGreenIndex);
    });

    test('it returns loading: false, because the data has loaded', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useStats(pattern), {
        wrapper: ContextWrapper,
      });
      await waitForNextUpdate();
      const { loading } = await result.current;

      expect(loading).toBe(false);
    });

    test('it returns a null error, because no errors occurred', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useStats(pattern), {
        wrapper: ContextWrapper,
      });
      await waitForNextUpdate();
      const { error } = await result.current;

      expect(error).toBeNull();
    });
  });

  describe('fetch rejects with an error', () => {
    const errorMessage = 'simulated error';

    beforeEach(() => {
      mockHttpFetch.mockRejectedValue(new Error(errorMessage));
    });

    test('it returns null stats, because an error occurred', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useStats(pattern), {
        wrapper: ContextWrapper,
      });
      await waitForNextUpdate();
      const { stats } = await result.current;

      expect(stats).toBeNull();
    });

    test('it returns loading: false, because data loading reached a terminal state', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useStats(pattern), {
        wrapper: ContextWrapper,
      });
      await waitForNextUpdate();
      const { loading } = await result.current;

      expect(loading).toBe(false);
    });

    test('it returns the expected error', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useStats(pattern), {
        wrapper: ContextWrapper,
      });
      await waitForNextUpdate();
      const { error } = await result.current;

      expect(error).toEqual(ERROR_LOADING_STATS(errorMessage));
    });
  });
});
