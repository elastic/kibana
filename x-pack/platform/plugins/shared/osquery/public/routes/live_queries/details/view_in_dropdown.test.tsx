/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ViewInDropdown } from './view_in_dropdown';
import { TestProvidersWithServices } from '../../../__test_helpers__/create_mock_kibana_services';

const mockGetUrl = jest.fn();
const mockNavigateToPrefilledEditor = jest.fn();

jest.mock('../../../common/hooks/use_logs_data_view', () => ({
  useLogsDataView: jest.fn(() => ({
    data: { id: 'logs-osquery-data-view-id', title: 'logs-osquery_manager.result*' },
  })),
}));

const mockUseKibana = jest.fn();

jest.mock('../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
  useRouterNavigate: (path: string) => ({ onClick: jest.fn(), href: path }),
}));

const setupKibana = () => {
  mockGetUrl.mockResolvedValue('http://localhost:5601/app/discover#/test');
  mockUseKibana.mockReturnValue({
    services: {
      discover: { locator: { getUrl: mockGetUrl } },
      lens: {
        canUseEditor: jest.fn().mockReturnValue(true),
        navigateToPrefilledEditor: mockNavigateToPrefilledEditor,
      },
      application: {
        capabilities: {
          discover_v2: { show: true },
          osquery: { writeLiveQueries: true },
        },
      },
    },
  });
};

const renderDropdown = (props: Partial<Parameters<typeof ViewInDropdown>[0]> = {}) =>
  render(
    <TestProvidersWithServices>
      <ViewInDropdown actionId="action-123" {...props} />
    </TestProvidersWithServices>
  );

describe('ViewInDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibana();
  });

  it('renders the trigger button labelled "View in"', () => {
    renderDropdown();

    expect(screen.getByTestId('query-details-view-in')).toBeInTheDocument();
    expect(screen.getByText('View in')).toBeInTheDocument();
  });

  it('opens the panel when the trigger is clicked', async () => {
    renderDropdown();

    fireEvent.click(screen.getByText('View in'));

    await waitFor(() => {
      expect(screen.getByText('View in Discover')).toBeInTheDocument();
      expect(screen.getByText('View in Lens')).toBeInTheDocument();
    });
  });

  it('Discover item opens in a new tab', async () => {
    renderDropdown({
      actionId: 'action-xyz',
      startDate: '2025-06-15T10:00:00.000Z',
      endDate: '2025-06-15T11:00:00.000Z',
    });

    fireEvent.click(screen.getByText('View in'));

    await waitFor(() => {
      const discoverLink = screen.getByText('View in Discover').closest('a');
      expect(discoverLink).toHaveAttribute('target', '_blank');
    });
  });

  it('closes the panel when the trigger is clicked a second time', async () => {
    renderDropdown();

    fireEvent.click(screen.getByText('View in'));
    await waitFor(() => expect(screen.getByText('View in Discover')).toBeInTheDocument());

    fireEvent.click(screen.getByText('View in'));
    await waitFor(() => expect(screen.queryByText('View in Discover')).not.toBeInTheDocument());
  });

  it('closes the panel after the Discover item is selected', async () => {
    renderDropdown();

    fireEvent.click(screen.getByText('View in'));
    await waitFor(() => expect(screen.getByText('View in Discover')).toBeInTheDocument());

    fireEvent.click(screen.getByText('View in Discover'));

    await waitFor(() => expect(screen.queryByText('View in Discover')).not.toBeInTheDocument());
  });

  it('closes the panel after the Lens item is selected', async () => {
    renderDropdown();

    fireEvent.click(screen.getByText('View in'));
    await waitFor(() => expect(screen.getByText('View in Lens')).toBeInTheDocument());

    fireEvent.click(screen.getByText('View in Lens'));

    await waitFor(() => expect(screen.queryByText('View in Lens')).not.toBeInTheDocument());
    expect(mockNavigateToPrefilledEditor).toHaveBeenCalled();
  });
  describe('scheduled executions', () => {
    it('passes scheduleId and executionCount through to the Discover item', async () => {
      render(
        <TestProvidersWithServices>
          <ViewInDropdown
            actionId="schedule-1"
            scheduleId="schedule-1"
            executionCount={1152}
            startDate="2026-09-01T11:40:03.074Z"
            endDate="2026-09-02T11:40:03.074Z"
          />
        </TestProvidersWithServices>
      );

      fireEvent.click(screen.getByText('View in'));

      await waitFor(() => {
        expect(mockGetUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.arrayContaining([
              expect.objectContaining({
                query: { match_phrase: { schedule_id: 'schedule-1' } },
              }),
              expect.objectContaining({
                query: {
                  match_phrase: { 'osquery_meta.schedule_execution_count': 1152 },
                },
              }),
            ]),
          })
        );
      });
    });

    it('uses an absolute time range so old executions are not missed by a relative window', async () => {
      render(
        <TestProvidersWithServices>
          <ViewInDropdown
            actionId="schedule-1"
            scheduleId="schedule-1"
            executionCount={1152}
            startDate="2026-09-01T11:40:03.074Z"
            endDate="2026-09-02T11:40:03.074Z"
          />
        </TestProvidersWithServices>
      );

      fireEvent.click(screen.getByText('View in'));

      await waitFor(() => {
        expect(mockGetUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            timeRange: {
              from: '2026-09-01T11:40:03.074Z',
              to: '2026-09-02T11:40:03.074Z',
              mode: 'absolute',
            },
          })
        );
      });
    });
  });
});
