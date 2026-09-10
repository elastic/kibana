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
  ResultTabs: () => null,
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

      const { viewInStartDate, viewInEndDate } = mockQueryDetailsHeader.mock.calls[0][0];

      // `timestamp` is the newest response document for the execution, so a window
      // starting there would exclude every earlier agent response.
      expect(new Date(viewInStartDate).getTime()).toBeLessThan(
        new Date(EXECUTION_TIMESTAMP).getTime()
      );
      expect(new Date(viewInEndDate).getTime()).toBeGreaterThan(
        new Date(EXECUTION_TIMESTAMP).getTime()
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

    it('should render an error prompt when the request fails', () => {
      mockHookResult({ data: undefined, isError: true });

      renderPage();

      expect(screen.getByText('Unable to load execution details')).toBeInTheDocument();
    });
  });
});
