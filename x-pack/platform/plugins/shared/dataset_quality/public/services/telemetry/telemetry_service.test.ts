/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import { datasetQualityEbtEvents } from './telemetry_events';
import { TelemetryService } from './telemetry_service';
import {
  NavigationTarget,
  NavigationSource,
  DatasetDetailsNavigatedEbtProps,
  DatasetDetailsEbtProps,
  WithTrackingId,
  WithDuration,
  DatasetEbtProps,
  DatasetNavigatedEbtProps,
} from './types';

// Mock uuidv4
jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => `mock-uuid-${Math.random()}`),
  };
});

describe('TelemetryService', () => {
  const service = new TelemetryService();

  const mockCoreStart = coreMock.createSetup();
  service.setup({ analytics: mockCoreStart.analytics });

  const defaultEbtProps: DatasetEbtProps = {
    index_name: 'logs-example-dataset-default',
    data_stream: {
      dataset: 'example-dataset',
      namespace: 'default',
      type: 'logs',
    },
    privileges: {
      can_monitor_data_stream: true,
      can_view_integrations: true,
      can_view_dashboards: true,
    },
    data_stream_health: 'poor',
    data_stream_aggregatable: true,
    degraded_percentage: 0.5,
    from: '2024-01-01T00:00:00.000Z',
    to: '2024-01-02T00:00:00.000Z',
  };

  const defaultSort: DatasetNavigatedEbtProps['sort'] = { field: 'name', direction: 'asc' };

  const defaultFilters: DatasetNavigatedEbtProps['filters'] = {
    is_degraded: false,
    query_length: 0,
    integrations: {
      total: 0,
      included: 0,
      excluded: 0,
    },
    namespaces: {
      total: 0,
      included: 0,
      excluded: 0,
    },
    qualities: {
      total: 0,
      included: 0,
      excluded: 0,
    },
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register all events', () => {
    expect(mockCoreStart.analytics.registerEventType).toHaveBeenCalledTimes(
      Object.keys(datasetQualityEbtEvents).length
    );
  });

  it('should report dataset navigated event', async () => {
    const telemetry = service.start();
    const exampleEventData: DatasetNavigatedEbtProps = {
      ...defaultEbtProps,
      sort: defaultSort,
      filters: defaultFilters,
    };

    telemetry.trackDatasetNavigated(exampleEventData);

    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
      datasetQualityEbtEvents.datasetNavigatedEventType.eventType,
      expect.objectContaining(exampleEventData)
    );
  });

  it('should report opening dataset details with a tracking_id', async () => {
    const telemetry = service.start();
    const exampleEventData: DatasetDetailsEbtProps = {
      ...defaultEbtProps,
    };

    telemetry.startDatasetDetailsTracking();

    // Increment jest's internal timer to simulate user interaction delay
    jest.advanceTimersByTime(500);

    telemetry.trackDatasetDetailsOpened(exampleEventData);

    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
      datasetQualityEbtEvents.datasetDetailsOpenedEventType.eventType,
      expect.objectContaining({
        ...exampleEventData,
        tracking_id: expect.stringMatching(/\S/),
        duration: expect.any(Number),
      })
    );

    // Expect the duration to be greater than the time mark
    const args = mockCoreStart.analytics.reportEvent.mock.calls[0][1] as WithTrackingId &
      WithDuration;
    expect(args.duration).toBeGreaterThanOrEqual(500);
  });

  it('should report closing dataset details with the same tracking_id', async () => {
    const telemetry = service.start();
    const exampleOpenEventData: DatasetDetailsEbtProps = {
      ...defaultEbtProps,
    };

    const exampleNavigatedEventData: DatasetDetailsNavigatedEbtProps = {
      ...exampleOpenEventData,
      breakdown_field: 'example_field',
      filters: {
        is_degraded: false,
      },
      target: NavigationTarget.Exit,
      source: NavigationSource.Chart,
    };

    telemetry.startDatasetDetailsTracking();
    telemetry.trackDatasetDetailsOpened(exampleOpenEventData);
    telemetry.trackDatasetDetailsNavigated(exampleNavigatedEventData);

    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledTimes(2);
    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
      datasetQualityEbtEvents.datasetDetailsNavigatedEventType.eventType,
      expect.objectContaining({
        ...exampleNavigatedEventData,
        tracking_id: expect.stringMatching(/\S/),
      })
    );

    // Make sure the tracking_id is the same for both events
    const [firstCall, secondCall] = mockCoreStart.analytics.reportEvent.mock.calls;
    expect((firstCall[1] as WithTrackingId).tracking_id).toEqual(
      (secondCall[1] as WithTrackingId).tracking_id
    );
    expect((secondCall[1] as DatasetDetailsNavigatedEbtProps).breakdown_field).toEqual(
      'example_field'
    );
  });

  it('should report dataset details breakdown field change event', async () => {
    const telemetry = service.start();
    const exampleEventData: DatasetDetailsEbtProps = {
      ...defaultEbtProps,
      breakdown_field: 'service.name',
    };

    telemetry.trackDatasetDetailsBreakdownFieldChanged(exampleEventData);

    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
      datasetQualityEbtEvents.datasetDetailsBreakdownFieldChangedEventType.eventType,
      expect.objectContaining(exampleEventData)
    );
  });
});
