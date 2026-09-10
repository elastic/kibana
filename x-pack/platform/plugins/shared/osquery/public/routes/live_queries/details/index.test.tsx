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
jest.mock('../../../actions/use_user_profiles', () => ({
  useBulkGetUserProfiles: jest.fn().mockReturnValue({ profilesMap: new Map(), isLoading: false }),
}));
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
jest.mock('../../saved_queries/edit/tabs', () => ({
  ResultTabs: ({ actionId }: { actionId: string }) => (
    <div data-test-subj="result-tabs">{`ResultTabs:${actionId}`}</div>
  ),
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
    mockUseSaveQueryFromDetails.mockReturnValue(mockSaveQueryFromDetails as any);
  });

  describe('single-query path', () => {
    it('renders QueryDetailsHeader and ResultTabs, not PackQueriesStatusTable', () => {
      mockUseLiveQueryDetails.mockReturnValue({ data: singleQueryData } as any);

      renderPage();

      expect(screen.getByTestId('query-details-header')).toBeInTheDocument();
      expect(screen.getByTestId('result-tabs')).toBeInTheDocument();
      expect(screen.queryByTestId('pack-queries-status-table')).not.toBeInTheDocument();
    });
  });

  describe('pack path', () => {
    it('renders PackQueriesStatusTable when pack_id is set', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, pack_id: 'pack-1' },
      } as any);

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
      } as any);

      renderPage();

      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
      expect(screen.queryByTestId('query-details-header')).not.toBeInTheDocument();
    });

    it('renders PackQueriesStatusTable when queries is empty', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, queries: [] },
      } as any);

      renderPage();

      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
      expect(screen.queryByTestId('query-details-header')).not.toBeInTheDocument();
    });

    it('renders PackQueriesStatusTable when queries is undefined', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, queries: undefined },
      } as any);

      renderPage();

      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
      expect(screen.queryByTestId('query-details-header')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('does not crash when data is undefined', () => {
      mockUseLiveQueryDetails.mockReturnValue({ data: undefined } as any);

      expect(() => renderPage()).not.toThrow();

      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
      expect(screen.queryByTestId('query-details-header')).not.toBeInTheDocument();
    });
  });
});
