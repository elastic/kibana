/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import {
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
} from '@kbn/management-settings-ids';
import { useScheduledDiscoverySettings } from './use_scheduled_discovery_settings';

const createClient = (values: Record<string, boolean | number>) =>
  ({
    get: jest.fn((key: string, defaultValue: boolean | number) => values[key] ?? defaultValue),
    set: jest.fn().mockResolvedValue(undefined),
  } as unknown as IUiSettingsClient);

const createHttp = () =>
  ({
    put: jest.fn().mockResolvedValue({}),
  } as unknown as HttpSetup);

describe('useScheduledDiscoverySettings', () => {
  it('saves scheduled discovery settings through the Significant Events settings route', async () => {
    const client = createClient({
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: false,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 30,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES]: 30,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES]: 10,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE]: 3,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE]: 5,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES]: 3,
    });
    const http = createHttp();
    const { result } = renderHook(() => useScheduledDiscoverySettings({ client, http }));

    act(() => {
      result.current.setDraft((previous) => ({
        ...previous,
        enabled: true,
        detectionIntervalMinutes: 45,
        targetCoverageMinutes: 60,
        reviewIntervalMinutes: 15,
        discoveryBatchSize: 6,
        triageBatchSize: 8,
        maxReviewPasses: 4,
      }));
    });

    expect(result.current.hasChanged).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(http.put).toHaveBeenCalledWith(
      '/internal/streams/_significant_events/scheduled_discovery/settings',
      {
        body: JSON.stringify({
          scheduledDiscovery: {
            enabled: true,
            detectionIntervalMinutes: 45,
            targetCoverageMinutes: 60,
            reviewIntervalMinutes: 15,
            discoveryBatchSize: 6,
            triageBatchSize: 8,
            maxReviewPasses: 4,
          },
        }),
      }
    );
    expect(client.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      true
    );
    expect(client.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
      45
    );
    expect(client.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES,
      60
    );
    expect(client.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
      15
    );
    expect(client.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
      6
    );
    expect(client.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE,
      8
    );
    expect(client.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
      4
    );
    expect(result.current.saved).toEqual(result.current.draft);
    expect(result.current.hasChanged).toBe(false);
  });
});
