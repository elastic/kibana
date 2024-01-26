/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { DataQualityProvider, useDataQualityContext } from '.';

const mockReportDataQualityIndexChecked = jest.fn();
const mockReportDataQualityCheckAllClicked = jest.fn();
const mockHttpFetch = jest.fn();
const { toasts } = notificationServiceMock.createSetupContract();
const mockTelemetryEvents = {
  reportDataQualityIndexChecked: mockReportDataQualityIndexChecked,
  reportDataQualityCheckAllCompleted: mockReportDataQualityCheckAllClicked,
};
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

describe('DataQualityContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it throws an error when useDataQualityContext hook is used without a DataQualityContext', () => {
    const { result } = renderHook(useDataQualityContext);

    expect(result.error).toEqual(
      new Error('useDataQualityContext must be used within a DataQualityProvider')
    );
  });

  test('it should return the httpFetch function', async () => {
    const { result } = renderHook(useDataQualityContext, { wrapper: ContextWrapper });
    const httpFetch = await result.current.httpFetch;

    const path = '/path/to/resource';
    httpFetch(path);

    expect(mockHttpFetch).toBeCalledWith(path);
  });

  test('it should return the telemetry events', async () => {
    const { result } = renderHook(useDataQualityContext, { wrapper: ContextWrapper });
    const telemetryEvents = await result.current.telemetryEvents;

    expect(telemetryEvents).toEqual(mockTelemetryEvents);
  });

  test('it should return the isILMAvailable param', async () => {
    const { result } = renderHook(useDataQualityContext, { wrapper: ContextWrapper });
    const isILMAvailable = await result.current.isILMAvailable;

    expect(isILMAvailable).toEqual(true);
  });
});
