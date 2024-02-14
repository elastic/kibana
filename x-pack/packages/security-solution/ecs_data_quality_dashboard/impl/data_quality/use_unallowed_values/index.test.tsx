/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@elastic/ecs';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { getUnallowedValueRequestItems } from '../data_quality_panel/allowed_values/helpers';
import { DataQualityProvider } from '../data_quality_panel/data_quality_context';
import { mockUnallowedValuesResponse } from '../mock/unallowed_values/mock_unallowed_values';
import { ERROR_LOADING_UNALLOWED_VALUES } from '../translations';
import { EcsMetadata, UnallowedValueRequestItem } from '../types';
import { useUnallowedValues, UseUnallowedValues } from '.';
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

const ecsMetadata = EcsFlat as unknown as Record<string, EcsMetadata>;
const indexName = 'auditbeat-custom-index-1';
const requestItems = getUnallowedValueRequestItems({
  ecsMetadata,
  indexName,
});

describe('useUnallowedValues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when requestItems is empty', () => {
    const emptyRequestItems: UnallowedValueRequestItem[] = [];

    test('it does NOT make an http request', async () => {
      await renderHook(
        () =>
          useUnallowedValues({
            indexName,
            requestItems: emptyRequestItems, // <-- empty
          }),
        {
          wrapper: ContextWrapper,
        }
      );

      expect(mockHttpFetch).not.toBeCalled();
    });
  });

  describe('successful response from the unallowed values api', () => {
    let unallowedValuesResult: UseUnallowedValues | undefined;

    beforeEach(async () => {
      mockHttpFetch.mockResolvedValue(mockUnallowedValuesResponse);

      const { result, waitForNextUpdate } = renderHook(
        () => useUnallowedValues({ indexName, requestItems }),
        {
          wrapper: ContextWrapper,
        }
      );
      await waitForNextUpdate();
      unallowedValuesResult = await result.current;
    });

    test('it returns the expected unallowed values', async () => {
      expect(unallowedValuesResult?.unallowedValues).toEqual({
        'event.category': [
          { count: 2, fieldName: 'an_invalid_category' },
          { count: 1, fieldName: 'theory' },
        ],
        'event.kind': [],
        'event.outcome': [],
        'event.type': [],
      });
    });

    test('it returns loading: false, because the data has loaded', async () => {
      expect(unallowedValuesResult?.loading).toBe(false);
    });

    test('it returns a null error, because no errors occurred', async () => {
      expect(unallowedValuesResult?.error).toBeNull();
    });
  });

  describe('fetch rejects with an error', () => {
    let unallowedValuesResult: UseUnallowedValues | undefined;
    const errorMessage = 'simulated error';

    beforeEach(async () => {
      mockHttpFetch.mockRejectedValue(new Error(errorMessage));

      const { result, waitForNextUpdate } = renderHook(
        () => useUnallowedValues({ indexName, requestItems }),
        {
          wrapper: ContextWrapper,
        }
      );
      await waitForNextUpdate();
      unallowedValuesResult = await result.current;
    });

    test('it returns null unallowed values, because an error occurred', async () => {
      expect(unallowedValuesResult?.unallowedValues).toBeNull();
    });

    test('it returns loading: false, because data loading reached a terminal state', async () => {
      expect(unallowedValuesResult?.loading).toBe(false);
    });

    test('it returns the expected error', async () => {
      expect(unallowedValuesResult?.error).toEqual(
        ERROR_LOADING_UNALLOWED_VALUES({ details: errorMessage, indexName })
      );
    });
  });
});
