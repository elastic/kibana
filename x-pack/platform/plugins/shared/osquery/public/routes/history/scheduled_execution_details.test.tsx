/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScheduledExecutionDetailsPage } from './scheduled_execution_details';
import { useScheduledExecutionDetails } from '../../actions/use_scheduled_execution_details';
import type { ScheduledExecutionDetailsItem } from '../../actions/use_scheduled_execution_details';
import {
  TestProvidersWithServices,
  createMockKibanaServices,
} from '../../__test_helpers__/create_mock_kibana_services';

const mockQueryDetailsHeader = jest.fn();
const mockResultTabs = jest.fn();

jest.mock('../../actions/use_scheduled_execution_details', () => ({
  ...jest.requireActual('../../actions/use_scheduled_execution_details'),
  useScheduledExecutionDetails: jest.fn(),
}));
jest.mock('../live_queries/details/query_details_header', () => ({
  QueryDetailsHeader: (props: Record<string, unknown>) => {
    mockQueryDetailsHeader(props);

    return null;
  },
}));
jest.mock('../saved_queries/edit/tabs', () => ({
  ResultTabs: (props: Record<string, unknown>) => {
    mockResultTabs(props);

    return null;
  },
}));
jest.mock('../../results/export_filters_context', () => ({
  ExportFiltersProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../common/hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));
jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useRouterNavigate: (path: string) => ({ onClick: jest.fn(), href: path }),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ scheduleId: 'schedule-1', executionCount: '1152' }),
  Redirect: () => null,
}));

const mockUseScheduledExecutionDetails = useScheduledExecutionDetails as jest.MockedFunction<
  typeof useScheduledExecutionDetails
>;

const EXECUTION_TIMESTAMP = '2026-09-01T12:00:00.000Z';

const baseDetails: ScheduledExecutionDetailsItem = {
  scheduleId: 'schedule-1',
  executionCount: 1152,
  packId: 'pack-1',
  packName: 'My Pack',
  queryName: 'query-1',
  queryText: 'SELECT * FROM processes',
  timestamp: EXECUTION_TIMESTAMP,
  agentCount: 3,
  successCount: 3,
  errorCount: 0,
  totalRows: 42,
};

const mockHookResult = (overrides: Record<string, unknown> = {}) => {
  mockUseScheduledExecutionDetails.mockReturnValue({
    data: baseDetails,
    isLoading: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useScheduledExecutionDetails>);
};

const renderPage = () => {
  const services = createMockKibanaServices();

  return render(
    <TestProvidersWithServices services={services}>
      <ScheduledExecutionDetailsPage />
    </TestProvidersWithServices>
  );
};

describe('ScheduledExecutionDetailsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookResult();
  });

  describe('View-in date window', () => {
    it('should bracket the execution timestamp on both sides so earlier agent responses are included', () => {
      renderPage();

      expect(mockQueryDetailsHeader).toHaveBeenCalledWith(
        expect.objectContaining({
          viewInStartDate: '2026-09-01T11:00:00.000Z',
          viewInEndDate: '2026-09-01T13:00:00.000Z',
          viewInMode: 'absolute',
        })
      );
    });

    it('should forward schedule identity to ResultTabs', () => {
      renderPage();

      expect(mockResultTabs).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'schedule-1',
          startDate: EXECUTION_TIMESTAMP,
          scheduleId: 'schedule-1',
          executionCount: 1152,
          failedAgentsCount: 0,
        })
      );
    });

    it('should still report the execution timestamp itself as the run time', () => {
      renderPage();

      expect(mockQueryDetailsHeader).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ '@timestamp': EXECUTION_TIMESTAMP }),
          executionCount: 1152,
          packName: 'My Pack',
        })
      );
    });
  });

  describe('states', () => {
    it('should render an empty prompt instead of the header when there is no execution data', () => {
      mockHookResult({ data: undefined });

      renderPage();

      expect(mockQueryDetailsHeader).not.toHaveBeenCalled();
      expect(screen.getByText('No details for this execution')).toBeInTheDocument();
    });

    it('should render an empty prompt for a successful response with no action_response hits', () => {
      mockHookResult({
        data: {
          ...baseDetails,
          timestamp: '',
          queryName: '',
          queryText: '',
          agentCount: 0,
          successCount: 0,
          errorCount: 0,
          totalRows: 0,
        },
      });

      renderPage();

      expect(mockQueryDetailsHeader).not.toHaveBeenCalled();
      expect(screen.getByText('No details for this execution')).toBeInTheDocument();
    });

    it('should still render details when the pack saved object is gone but hits exist', () => {
      mockHookResult({
        data: {
          ...baseDetails,
          packName: '',
          queryName: '',
          queryText: '',
        },
      });

      renderPage();

      expect(mockQueryDetailsHeader).toHaveBeenCalled();
      expect(screen.queryByText('No details for this execution')).not.toBeInTheDocument();
    });

    it('should render an error prompt when the request fails', () => {
      mockHookResult({ data: undefined, isError: true });

      renderPage();

      expect(screen.getByText('Unable to load execution details')).toBeInTheDocument();
    });
  });
});
