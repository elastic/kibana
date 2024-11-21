/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Theme } from '@elastic/charts';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { renderHook } from '@testing-library/react';
import React, { FC, PropsWithChildren } from 'react';

import { DataQualityProvider, useDataQualityContext } from '.';

const mockReportDataQualityIndexChecked = jest.fn();
const mockReportDataQualityCheckAllClicked = jest.fn();
const mockHttpFetch = jest.fn();
const { toasts } = notificationServiceMock.createSetupContract();
const mockTelemetryEvents = {
  reportDataQualityIndexChecked: mockReportDataQualityIndexChecked,
  reportDataQualityCheckAllCompleted: mockReportDataQualityCheckAllClicked,
};
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
    defaultStartTime="now-7d"
    defaultEndTime="now"
  >
    {children}
  </DataQualityProvider>
);

describe('DataQualityContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it throws an error when useDataQualityContext hook is used without a DataQualityContext', () => {
    expect(() => renderHook(useDataQualityContext)).toThrow(
      new Error('useDataQualityContext must be used within a DataQualityProvider')
    );
  });

  test('it should return the httpFetch function', () => {
    const { result } = renderHook(useDataQualityContext, { wrapper: ContextWrapper });
    const httpFetch = result.current.httpFetch;

    const path = '/path/to/resource';
    httpFetch(path);

    expect(mockHttpFetch).toBeCalledWith(path);
  });

  test('it should return the telemetry events', () => {
    const { result } = renderHook(useDataQualityContext, { wrapper: ContextWrapper });
    const telemetryEvents = result.current.telemetryEvents;

    expect(telemetryEvents).toEqual(mockTelemetryEvents);
  });

  test('it should return the isILMAvailable param', async () => {
    const { result } = renderHook(useDataQualityContext, { wrapper: ContextWrapper });
    const isILMAvailable = result.current.isILMAvailable;

    expect(isILMAvailable).toEqual(true);
  });
});
