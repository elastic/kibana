/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { DataQualityProvider } from '../data_quality_panel/data_quality_context';
import { mockMappingsResponse } from '../mock/mappings_response/mock_mappings_response';
import { ERROR_LOADING_MAPPINGS } from '../translations';
import { useMappings, UseMappings } from '.';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

const mockHttpFetch = jest.fn();
const mockReportDataQualityIndexChecked = jest.fn();
const mockReportDataQualityCheckAllClicked = jest.fn();
const mockTelemetryEvents = {
  reportDataQualityIndexChecked: mockReportDataQualityIndexChecked,
  reportDataQualityCheckAllCompleted: mockReportDataQualityCheckAllClicked,
};
const { toasts } = notificationServiceMock.createSetupContract();

const ContextWrapper: React.FC = ({ children }) => (
  <DataQualityProvider
    httpFetch={mockHttpFetch}
    telemetryEvents={mockTelemetryEvents}
    isILMAvailable={true}
    toasts={toasts}
  >
    {children}
  </DataQualityProvider>
);

const pattern = 'auditbeat-*';

describe('useMappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful response from the mappings api', () => {
    let mappingsResult: UseMappings | undefined;

    beforeEach(async () => {
      mockHttpFetch.mockResolvedValue(mockMappingsResponse);

      const { result, waitForNextUpdate } = renderHook(() => useMappings(pattern), {
        wrapper: ContextWrapper,
      });
      await waitForNextUpdate();
      mappingsResult = await result.current;
    });

    test('it returns the expected mappings', async () => {
      expect(mappingsResult?.indexes).toEqual(mockMappingsResponse);
    });

    test('it returns loading: false, because the data has loaded', async () => {
      expect(mappingsResult?.loading).toBe(false);
    });

    test('it returns a null error, because no errors occurred', async () => {
      expect(mappingsResult?.error).toBeNull();
    });
  });

  describe('fetch rejects with an error', () => {
    let mappingsResult: UseMappings | undefined;
    const errorMessage = 'simulated error';

    beforeEach(async () => {
      mockHttpFetch.mockRejectedValue(new Error(errorMessage));

      const { result, waitForNextUpdate } = renderHook(() => useMappings(pattern), {
        wrapper: ContextWrapper,
      });
      await waitForNextUpdate();
      mappingsResult = await result.current;
    });

    test('it returns null mappings, because an error occurred', async () => {
      expect(mappingsResult?.indexes).toBeNull();
    });

    test('it returns loading: false, because data loading reached a terminal state', async () => {
      expect(mappingsResult?.loading).toBe(false);
    });

    test('it returns the expected error', async () => {
      expect(mappingsResult?.error).toEqual(
        ERROR_LOADING_MAPPINGS({ details: errorMessage, patternOrIndexName: pattern })
      );
    });
  });
});
