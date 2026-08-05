/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import { significantEventTableColumns } from '.';
import { SignificantEventFlyout } from './significant_event_flyout';

jest.mock('../../../../hooks/use_fetch_significant_event_lifecycle', () => ({
  useFetchSignificantEventLifecycle: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));
jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(() => ({
    services: {
      focusedSignificantEventService: {
        setFocusedEvent: jest.fn(),
        clearFocusedEvent: jest.fn(),
      },
    },
    core: { notifications: { toasts: { addSuccess: jest.fn() } } },
  })),
}));
jest.mock('../../../../hooks/use_trigger_investigation', () => ({
  useTriggerInvestigation: jest.fn(() => ({
    triggerInvestigation: jest.fn(),
    isTriggering: false,
  })),
}));
jest.mock('../../../../hooks/use_update_significant_event', () => ({
  useUpdateSignificantEvent: jest.fn(() => ({ updateEventStatus: jest.fn(), isUpdating: false })),
}));
jest.mock('../../../../hooks/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: jest.fn(() => ({ blocksActivity: false })),
}));
jest.mock('../../../../util/formatters', () => ({
  formatTimestamp: jest.fn((timestamp: string) => `formatted:${timestamp}`),
}));
jest.mock('../../../../components/flyout_components/flyout_toolbar_header', () => ({
  FlyoutToolbarHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./lifecycle_timeline', () => ({
  LifecycleTimeline: () => null,
}));
jest.mock('./event_investigations', () => ({
  EventInvestigations: () => null,
}));
jest.mock('../../../../components/significant_event_details/significant_event_details', () => ({
  SignificantEventDetails: () => null,
}));

const event: SignificantEventResponse = {
  '@timestamp': '2026-01-02T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  event_uuid: 'version-2',
  event_id: 'event-1',
  status: 'open',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: '40-medium',
  confidence: 0.8,
};

describe('Significant Events timestamp rendering', () => {
  it('sorts the Timestamp column by the lineage creation timestamp', () => {
    expect(significantEventTableColumns[0]).toEqual(
      expect.objectContaining({ field: 'created_at' })
    );
  });

  it('renders the lineage creation timestamp in the flyout header', () => {
    render(<SignificantEventFlyout event={event} onClose={jest.fn()} />);

    expect(
      screen.getByText(
        (_, element) => element?.textContent?.startsWith(`formatted:${event.created_at}`) ?? false
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(`formatted:${event['@timestamp']}`)).not.toBeInTheDocument();
  });
});
