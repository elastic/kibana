/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { ViewResultsInDiscoverAction } from './view_results_in_discover';
import { ViewResultsActionButtonType } from '../live_queries/form/pack_queries_status_table';
import { TestProvidersWithServices } from '../__test_helpers__/create_mock_kibana_services';

const mockGetUrl = jest.fn();

jest.mock('../common/hooks/use_logs_data_view', () => ({
  useLogsDataView: jest.fn(() => ({
    data: { id: 'logs-osquery-data-view-id', title: 'logs-osquery_manager.result*' },
  })),
}));

const mockUseKibana = jest.fn();

jest.mock('../common/lib/kibana', () => ({
  ...jest.requireActual('../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
}));

const setupKibana = (overrides: Record<string, unknown> = {}) => {
  mockGetUrl.mockResolvedValue('http://localhost:5601/app/discover#/test-url');

  mockUseKibana.mockReturnValue({
    services: {
      discover: {
        locator: {
          getUrl: mockGetUrl,
        },
      },
      application: {
        capabilities: {
          discover_v2: { show: true },
          osquery: {
            writeLiveQueries: true,
            runSavedQueries: true,
            readPacks: true,
            writePacks: true,
            readSavedQueries: true,
            writeSavedQueries: true,
          },
        },
      },
      ...overrides,
    },
  });
};

describe('ViewResultsInDiscoverAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibana();
  });

  describe('visibility', () => {
    it('should render button when discover permission is granted', async () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInDiscoverAction
            actionId="test-action-id"
            buttonType={ViewResultsActionButtonType.button}
          />
        </TestProvidersWithServices>
      );

      await waitFor(() => {
        expect(screen.getByText('View in Discover')).toBeInTheDocument();
      });
    });

    it('should not render when discover permission is denied', () => {
      mockUseKibana.mockReturnValue({
        services: {
          discover: { locator: { getUrl: mockGetUrl } },
          application: {
            capabilities: {
              discover_v2: { show: false },
              osquery: {},
            },
          },
        },
      });

      const { container } = render(
        <TestProvidersWithServices>
          <ViewResultsInDiscoverAction
            actionId="test-action-id"
            buttonType={ViewResultsActionButtonType.button}
          />
        </TestProvidersWithServices>
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('button types', () => {
    it('should render as button with text when buttonType is button', async () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInDiscoverAction
            actionId="test-action-id"
            buttonType={ViewResultsActionButtonType.button}
          />
        </TestProvidersWithServices>
      );

      await waitFor(() => {
        expect(screen.getByText('View in Discover')).toBeInTheDocument();
      });
    });

    it('should render as icon button when buttonType is icon', async () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInDiscoverAction
            actionId="test-action-id"
            buttonType={ViewResultsActionButtonType.icon}
          />
        </TestProvidersWithServices>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('View in Discover')).toBeInTheDocument();
      });
    });
  });

  describe('locator params', () => {
    it('should call locator with action_id filter for live queries', async () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInDiscoverAction
            actionId="test-action-123"
            buttonType={ViewResultsActionButtonType.button}
            startDate="2025-06-15T10:00:00.000Z"
            endDate="2025-06-15T11:00:00.000Z"
          />
        </TestProvidersWithServices>
      );

      await waitFor(() => {
        expect(mockGetUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            indexPatternId: 'logs-osquery-data-view-id',
            filters: expect.arrayContaining([
              expect.objectContaining({
                query: { match_phrase: { action_id: 'test-action-123' } },
              }),
            ]),
            timeRange: expect.objectContaining({
              from: '2025-06-15T10:00:00.000Z',
              to: '2025-06-15T11:00:00.000Z',
              mode: 'absolute',
            }),
          })
        );
      });
    });

    it('should call locator with schedule_id and execution_count filters for scheduled queries', async () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInDiscoverAction
            actionId="test-action-123"
            buttonType={ViewResultsActionButtonType.button}
            scheduleId="schedule-abc"
            executionCount={5}
          />
        </TestProvidersWithServices>
      );

      await waitFor(() => {
        expect(mockGetUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.arrayContaining([
              expect.objectContaining({
                query: { match_phrase: { schedule_id: 'schedule-abc' } },
              }),
              expect.objectContaining({
                query: {
                  match_phrase: { 'osquery_meta.schedule_execution_count': 5 },
                },
              }),
            ]),
          })
        );
      });
    });

    it('should use relative time range when no start/end dates provided', async () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInDiscoverAction
            actionId="test-action-123"
            buttonType={ViewResultsActionButtonType.button}
          />
        </TestProvidersWithServices>
      );

      await waitFor(() => {
        expect(mockGetUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            timeRange: expect.objectContaining({
              from: 'now-1d',
              to: 'now',
              mode: 'relative',
            }),
          })
        );
      });
    });

    it('should use 7-day relative range for scheduled queries without dates', async () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInDiscoverAction
            actionId="test-action-123"
            buttonType={ViewResultsActionButtonType.button}
            scheduleId="schedule-abc"
            executionCount={1}
          />
        </TestProvidersWithServices>
      );

      await waitFor(() => {
        expect(mockGetUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            timeRange: expect.objectContaining({
              from: 'now-7d',
              to: 'now',
            }),
          })
        );
      });
    });
  });

  describe('href', () => {
    it('should set the resolved URL as href on the button', async () => {
      mockGetUrl.mockResolvedValue('http://localhost:5601/app/discover#/resolved-url');

      render(
        <TestProvidersWithServices>
          <ViewResultsInDiscoverAction
            actionId="test-action-id"
            buttonType={ViewResultsActionButtonType.button}
          />
        </TestProvidersWithServices>
      );

      await waitFor(() => {
        const link = screen.getByText('View in Discover').closest('a');
        expect(link).toHaveAttribute('href', 'http://localhost:5601/app/discover#/resolved-url');
      });
    });
  });
});
