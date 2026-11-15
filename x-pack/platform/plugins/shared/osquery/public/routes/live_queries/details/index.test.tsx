/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LiveQueryDetailsPage } from '.';
import { useLiveQueryDetails } from '../../../actions/use_live_query_details';
import { useSaveQueryFromDetails } from './use_save_query_from_details';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import {
  TestProvidersWithServices,
  createMockKibanaServices,
} from '../../../__test_helpers__/create_mock_kibana_services';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ actionId: 'action-123' }),
}));

jest.mock('../../../actions/use_live_query_details');
jest.mock('./use_save_query_from_details');
jest.mock('../../../common/hooks/use_breadcrumbs');
jest.mock('../../../common/experimental_features_context', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
  useExperimentalFeatures: jest
    .fn()
    .mockReturnValue({ exportResults: false, rruleScheduling: false, crossProjectSearch: false }),
  ExperimentalFeaturesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../../results/export_filters_context', () => ({
  useExportFilters: jest.fn().mockReturnValue(undefined),
  ExportFiltersProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useExportFiltersContext: jest.fn().mockReturnValue(null),
}));
const mockResultTabs = jest.fn();

jest.mock('../../saved_queries/edit/tabs', () => ({
  ResultTabs: (props: { actionId: string }) => {
    mockResultTabs(props);

    return <div data-test-subj="result-tabs">{`ResultTabs:${props.actionId}`}</div>;
  },
}));
jest.mock('../../../live_queries/form/pack_queries_status_table', () => ({
  PackQueriesStatusTable: () => <div data-test-subj="pack-queries-status-table" />,
  ViewResultsActionButtonType: { icon: 'icon', button: 'button', menuItem: 'menuItem' },
}));
jest.mock('./query_details_header', () => ({
  QueryDetailsHeader: ({ actionId }: { actionId: string }) => (
    <div data-test-subj="query-details-header">{`Header:${actionId}`}</div>
  ),
}));

const mockUseLiveQueryDetails = useLiveQueryDetails as jest.MockedFunction<
  typeof useLiveQueryDetails
>;
const mockUseSaveQueryFromDetails = useSaveQueryFromDetails as jest.MockedFunction<
  typeof useSaveQueryFromDetails
>;

const mockSaveQueryFromDetails = {
  canSave: false,
  showSavedQueryFlyout: false,
  handleShowSaveQueryFlyout: jest.fn(),
  handleCloseSaveQueryFlyout: jest.fn(),
  savedQueryDefaultValue: {},
};

const singleQueryData: LiveQueryDetailsItem = {
  action_id: 'action-123',
  '@timestamp': '2025-06-15T10:00:00.000Z',
  agent_all: false,
  agent_ids: [],
  agent_platforms: [],
  agent_policy_ids: [],
  queries: [
    {
      action_id: 'query-action-456',
      id: 'query-1',
      query: 'SELECT * FROM processes',
      agents: [],
    },
  ],
  status: 'completed',
};

const renderPage = () => {
  const services = createMockKibanaServices();

  return render(
    <TestProvidersWithServices services={services}>
      <LiveQueryDetailsPage />
    </TestProvidersWithServices>
  );
};

describe('LiveQueryDetailsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBreadcrumbs as jest.Mock).mockReturnValue(undefined);
    mockUseSaveQueryFromDetails.mockReturnValue(
      mockSaveQueryFromDetails as ReturnType<typeof useSaveQueryFromDetails>
    );
  });

  describe('single-query path', () => {
    it('renders QueryDetailsHeader and ResultTabs, not PackQueriesStatusTable', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: singleQueryData,
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('query-details-header')).toBeInTheDocument();
      expect(screen.getByTestId('result-tabs')).toBeInTheDocument();
      expect(screen.getByTestId('result-tabs')).toHaveTextContent('ResultTabs:query-action-456');
      expect(screen.queryByTestId('pack-queries-status-table')).not.toBeInTheDocument();
      expect(mockResultTabs).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'query-action-456',
          liveQueryActionId: 'action-123',
          startDate: '2025-06-15T10:00:00.000Z',
        })
      );
    });
  });

  describe('pack path', () => {
    it('renders PackQueriesStatusTable when pack_id is set', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, pack_id: 'pack-1' },
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
      expect(screen.queryByTestId('query-details-header')).not.toBeInTheDocument();
    });

    it('renders PackQueriesStatusTable when queries.length > 1', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: {
          ...singleQueryData,
          queries: [
            singleQueryData.queries![0],
            { ...singleQueryData.queries![0], action_id: 'query-2', id: 'query-2' },
          ],
        },
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
      expect(screen.queryByTestId('query-details-header')).not.toBeInTheDocument();
    });

    it('renders PackQueriesStatusTable when queries is empty', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, queries: [] as LiveQueryDetailsItem['queries'] },
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
      expect(screen.queryByTestId('query-details-header')).not.toBeInTheDocument();
    });

    it('renders PackQueriesStatusTable when queries is undefined', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, queries: undefined },
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
      expect(screen.queryByTestId('query-details-header')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders a skeleton while the initial fetch is in flight', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useLiveQueryDetails>);

      expect(() => renderPage()).not.toThrow();

      expect(screen.getByTestId('query-details-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('pack-queries-status-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('query-details-header')).not.toBeInTheDocument();
    });
  });
});
