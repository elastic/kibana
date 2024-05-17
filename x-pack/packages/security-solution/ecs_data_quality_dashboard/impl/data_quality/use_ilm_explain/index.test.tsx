/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { DataQualityProvider } from '../data_quality_panel/data_quality_context';
import { mockIlmExplain } from '../mock/ilm_explain/mock_ilm_explain';
import { ERROR_LOADING_ILM_EXPLAIN } from '../translations';
import { useIlmExplain, UseIlmExplain } from '.';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

const mockHttpFetch = jest.fn();
const mockReportDataQualityIndexChecked = jest.fn();
const mockReportDataQualityCheckAllClicked = jest.fn();
const mockTelemetryEvents = {
  reportDataQualityIndexChecked: mockReportDataQualityIndexChecked,
  reportDataQualityCheckAllCompleted: mockReportDataQualityCheckAllClicked,
};
const { toasts } = notificationServiceMock.createSetupContract();
const ContextWrapper: React.FC<PropsWithChildren> = ({ children }) => (
  <DataQualityProvider
    httpFetch={mockHttpFetch}
    telemetryEvents={mockTelemetryEvents}
    isILMAvailable={true}
    toasts={toasts}
  >
    {children}
  </DataQualityProvider>
);

const pattern = 'packetbeat-*';

describe('useIlmExplain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful response from the ilm api', () => {
    let ilmExplainResult: UseIlmExplain | undefined;

    beforeEach(async () => {
      mockHttpFetch.mockResolvedValue(mockIlmExplain);

      const { result } = renderHook<UseIlmExplain, void>(() => useIlmExplain(pattern), {
        wrapper: ContextWrapper,
      });
      // await waitFor();
      ilmExplainResult = await result.current;
    });

    test('it returns the expected ilmExplain map', async () => {
      expect(ilmExplainResult?.ilmExplain).toEqual(mockIlmExplain);
    });

    test('it returns loading: false, because the data has loaded', async () => {
      expect(ilmExplainResult?.loading).toBe(false);
    });

    test('it returns a null error, because no errors occurred', async () => {
      expect(ilmExplainResult?.error).toBeNull();
    });
  });

  describe('skip ilm api when isILMAvailable is false', () => {
    let ilmExplainResult: UseIlmExplain | undefined;

    beforeEach(async () => {
      const { result } = renderHook(() => useIlmExplain(pattern), {
        wrapper: ({ children }) => (
          <DataQualityProvider
            httpFetch={mockHttpFetch}
            telemetryEvents={mockTelemetryEvents}
            isILMAvailable={false}
            toasts={toasts}
          >
            {children}
          </DataQualityProvider>
        ),
      });
      // await waitFor();
      ilmExplainResult = await result.current;
    });

    test('it returns the expected ilmExplain map', async () => {
      expect(ilmExplainResult?.ilmExplain).toEqual(null);
    });

    test('it returns loading: false, because the request is aborted', async () => {
      expect(ilmExplainResult?.loading).toBe(false);
    });
  });

  describe('fetch rejects with an error', () => {
    let ilmExplainResult: UseIlmExplain | undefined;
    const errorMessage = 'simulated error';

    beforeEach(async () => {
      mockHttpFetch.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useIlmExplain(pattern), {
        wrapper: ContextWrapper,
      });
      // await waitFor();
      ilmExplainResult = await result.current;
    });

    test('it returns a null ilmExplain, because an error occurred', async () => {
      expect(ilmExplainResult?.ilmExplain).toBeNull();
    });

    test('it returns loading: false, because data loading reached a terminal state', async () => {
      expect(ilmExplainResult?.loading).toBe(false);
    });

    test('it returns the expected error', async () => {
      expect(ilmExplainResult?.error).toEqual(ERROR_LOADING_ILM_EXPLAIN(errorMessage));
    });
  });
});
