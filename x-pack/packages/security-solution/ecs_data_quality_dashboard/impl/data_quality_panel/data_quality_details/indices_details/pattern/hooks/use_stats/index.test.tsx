/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import React, { FC, PropsWithChildren } from 'react';

import { DataQualityProvider } from '../../../../../data_quality_context';
import { mockStatsAuditbeatIndex } from '../../../../../mock/stats/mock_stats_packetbeat_index';
import { ERROR_LOADING_STATS } from '../../../../../translations';
import { useStats, UseStats } from '.';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { Theme } from '@elastic/charts';

const mockHttpFetch = jest.fn();
const mockReportDataQualityIndexChecked = jest.fn();
const mockReportDataQualityCheckAllClicked = jest.fn();
const mockTelemetryEvents = {
  reportDataQualityIndexChecked: mockReportDataQualityIndexChecked,
  reportDataQualityCheckAllCompleted: mockReportDataQualityCheckAllClicked,
};
const { toasts } = notificationServiceMock.createSetupContract();

const ContextWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <DataQualityProvider
    httpFetch={mockHttpFetch}
    telemetryEvents={mockTelemetryEvents}
    isILMAvailable={true}
    toasts={toasts}
    addSuccessToast={jest.fn()}
    canUserCreateAndReadCases={jest.fn(() => true)}
    endDate={null}
    formatBytes={jest.fn()}
    formatNumber={jest.fn()}
    isAssistantEnabled={true}
    lastChecked={'2023-03-28T22:27:28.159Z'}
    openCreateCaseFlyout={jest.fn()}
    patterns={['auditbeat-*']}
    setLastChecked={jest.fn()}
    startDate={null}
    theme={{
      background: {
        color: '#000',
      },
    }}
    baseTheme={
      {
        background: {
          color: '#000',
        },
      } as Theme
    }
    ilmPhases={['hot', 'warm', 'unmanaged']}
    selectedIlmPhaseOptions={[
      {
        label: 'Hot',
        value: 'hot',
      },
      {
        label: 'Warm',
        value: 'warm',
      },
      {
        label: 'Unmanaged',
        value: 'unmanaged',
      },
    ]}
    setSelectedIlmPhaseOptions={jest.fn()}
  >
    {children}
  </DataQualityProvider>
);

const ContextWrapperILMNotAvailable: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <DataQualityProvider
    httpFetch={mockHttpFetch}
    telemetryEvents={mockTelemetryEvents}
    isILMAvailable={false}
    toasts={toasts}
    addSuccessToast={jest.fn()}
    canUserCreateAndReadCases={jest.fn(() => true)}
    endDate={null}
    formatBytes={jest.fn()}
    formatNumber={jest.fn()}
    isAssistantEnabled={true}
    lastChecked={'2023-03-28T22:27:28.159Z'}
    openCreateCaseFlyout={jest.fn()}
    patterns={['auditbeat-*']}
    setLastChecked={jest.fn()}
    startDate={null}
    theme={{
      background: {
        color: '#000',
      },
    }}
    baseTheme={
      {
        background: {
          color: '#000',
        },
      } as Theme
    }
    ilmPhases={['hot', 'warm', 'unmanaged']}
    selectedIlmPhaseOptions={[
      {
        label: 'Hot',
        value: 'hot',
      },
      {
        label: 'Warm',
        value: 'warm',
      },
      {
        label: 'Unmanaged',
        value: 'unmanaged',
      },
    ]}
    setSelectedIlmPhaseOptions={jest.fn()}
  >
    {children}
  </DataQualityProvider>
);

const pattern = 'auditbeat-*';
const startDate = `now-7d`;
const endDate = `now`;
const params = {
  pattern,
};

describe('useStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query with date range when ILM is not available', () => {
    const queryParams = {
      isILMAvailable: false,
      startDate,
      endDate,
    };

    beforeEach(async () => {
      mockHttpFetch.mockResolvedValue(mockStatsAuditbeatIndex);

      const { waitForNextUpdate } = renderHook(() => useStats({ pattern, startDate, endDate }), {
        wrapper: ContextWrapperILMNotAvailable,
      });
      await waitForNextUpdate();
    });
    test(`it calls the stats api with the expected params`, async () => {
      expect(mockHttpFetch.mock.calls[0][1].query).toEqual(queryParams);
    });
  });

  describe('successful response from the stats api', () => {
    let statsResult: UseStats | undefined;

    beforeEach(async () => {
      mockHttpFetch.mockResolvedValue(mockStatsAuditbeatIndex);

      const { result, waitForNextUpdate } = renderHook(() => useStats(params), {
        wrapper: ContextWrapper,
      });
      await waitForNextUpdate();
      statsResult = await result.current;
    });

    test('it returns the expected stats', async () => {
      expect(statsResult?.stats).toEqual(mockStatsAuditbeatIndex);
    });

    test('it returns loading: false, because the data has loaded', async () => {
      expect(statsResult?.loading).toBe(false);
    });

    test('it returns a null error, because no errors occurred', async () => {
      expect(statsResult?.error).toBeNull();
    });

    test(`it calls the stats api with the expected params`, async () => {
      expect(mockHttpFetch.mock.calls[0][1].query).toEqual({ isILMAvailable: true });
    });
  });

  describe('fetch rejects with an error', () => {
    let statsResult: UseStats | undefined;
    const errorMessage = 'simulated error';

    beforeEach(async () => {
      mockHttpFetch.mockRejectedValue(new Error(errorMessage));

      const { result, waitForNextUpdate } = renderHook(() => useStats(params), {
        wrapper: ContextWrapper,
      });
      await waitForNextUpdate();
      statsResult = await result.current;
    });

    test('it returns null stats, because an error occurred', async () => {
      expect(statsResult?.stats).toBeNull();
    });

    test('it returns loading: false, because data loading reached a terminal state', async () => {
      expect(statsResult?.loading).toBe(false);
    });

    test('it returns the expected error', async () => {
      expect(statsResult?.error).toEqual(ERROR_LOADING_STATS(errorMessage));
    });
  });
});
