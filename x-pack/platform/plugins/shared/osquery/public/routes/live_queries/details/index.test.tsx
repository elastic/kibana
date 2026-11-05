/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { formatDate } from '@elastic/eui';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';

import { LiveQueryDetailsPage } from '.';
import { useLiveQueryDetails } from '../../../actions/use_live_query_details';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';
import { useSaveQueryFromDetails } from './use_save_query_from_details';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';
import { TestProvidersWithServices } from '../../../__test_helpers__/create_mock_kibana_services';
import { useBulkGetUserProfiles } from '../../../actions/use_user_profiles';

const OSQUERY_DOC_LINK = 'https://docs.elastic.co/solutions/security/investigate/osquery';

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
// The Discover/Lens "View in" items only need to know whether a logs data view resolved; the
// real hook's network/query machinery isn't the concern of this header test.
jest.mock('../../../common/hooks/use_logs_data_view', () => ({
  useLogsDataView: jest.fn().mockReturnValue({ data: { id: 'logs-id', title: 'logs' } }),
}));
// `useRunByMetadata` resolves a user profile through this; no profile is needed to exercise the
// "Run by" fallback-to-username/"Elastic" text this suite asserts on.
jest.mock('../../../actions/use_user_profiles', () => ({
  useBulkGetUserProfiles: jest.fn().mockReturnValue({ profilesMap: new Map() }),
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
}));

const mockCanUseCases = jest.fn();
const mockOpenCaseModal = jest.fn();
// A plain passthrough stands in for the real `CasesContext` component the `cases` plugin would
// supply via `cases.ui.getCasesContext()` — same pattern already used by other osquery/cases tests.
const MockCasesContext: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
  <>{children}</>
);

const mockUseKibana = jest.fn();
jest.mock('../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
}));

const mockUseLiveQueryDetails = useLiveQueryDetails as jest.MockedFunction<
  typeof useLiveQueryDetails
>;
const mockUseSaveQueryFromDetails = useSaveQueryFromDetails as jest.MockedFunction<
  typeof useSaveQueryFromDetails
>;

const baseSaveQueryFromDetails = {
  canSave: true,
  showSavedQueryFlyout: false,
  handleShowSaveQueryFlyout: jest.fn(),
  handleCloseSaveQueryFlyout: jest.fn(),
  savedQueryDefaultValue: {},
};

interface SetupKibanaOptions {
  writeLiveQueries?: boolean;
  casePermissions?: { read: boolean; update: boolean; push: boolean };
  discoverShow?: boolean;
  lensAvailable?: boolean;
}

const setupKibana = ({
  writeLiveQueries = true,
  casePermissions = { read: true, update: true, push: true },
  discoverShow = true,
  lensAvailable = true,
}: SetupKibanaOptions = {}) => {
  mockCanUseCases.mockReturnValue(casePermissions);

  mockUseKibana.mockReturnValue({
    services: {
      docLinks: { links: { osquery: { guide: OSQUERY_DOC_LINK } } },
      application: {
        capabilities: {
          osquery: {
            writeLiveQueries,
            runSavedQueries: true,
            readPacks: true,
            writePacks: true,
            readSavedQueries: true,
            writeSavedQueries: true,
          },
          discover_v2: { show: discoverShow },
          navLinks: { integrations: true },
        },
        getUrlForApp: (appId: string, { path }: { path?: string } = {}) =>
          `/app/${appId}${path ?? ''}`,
      },
      cases: {
        helpers: { canUseCases: mockCanUseCases, getRuleIdFromEvent: jest.fn() },
        ui: { getCasesContext: jest.fn().mockReturnValue(MockCasesContext) },
        hooks: {
          useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({ open: mockOpenCaseModal }),
        },
      },
      discover: { locator: { getUrl: jest.fn().mockResolvedValue('http://localhost/discover') } },
      lens: {
        canUseEditor: jest.fn().mockReturnValue(lensAvailable),
        navigateToPrefilledEditor: jest.fn(),
      },
      notifications: { toasts: { addWarning: jest.fn(), addSuccess: jest.fn() } },
      http: { fetch: jest.fn() },
    },
  });
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

const renderPage = () =>
  render(
    <MockAppHeaderProvider>
      <TestProvidersWithServices>
        <LiveQueryDetailsPage />
      </TestProvidersWithServices>
    </MockAppHeaderProvider>
  );

describe('LiveQueryDetailsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBreadcrumbs as jest.Mock).mockReturnValue(undefined);
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    jest
      .mocked(useBulkGetUserProfiles)
      .mockReturnValue({ profilesMap: new Map(), isLoading: false });
    mockUseSaveQueryFromDetails.mockReturnValue(
      baseSaveQueryFromDetails as ReturnType<typeof useSaveQueryFromDetails>
    );
    setupKibana();
  });

  describe('loading state', () => {
    it('renders a skeleton header (back only, no title) while the initial fetch is in flight', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('appHeaderSkeleton')).toBeInTheDocument();
      expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to History');
      expect(screen.queryByTestId('appHeaderTitle')).not.toBeInTheDocument();
      expect(screen.getByTestId('query-details-loading')).toBeInTheDocument();
    });
  });

  describe('single-query (live) path', () => {
    beforeEach(() => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: singleQueryData,
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);
    });

    it('titles the header with the query text, backs to History, and shows a "Run by" metadata item', () => {
      renderPage();

      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('SELECT * FROM processes');
      expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to History');
      expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('href', 'history');

      const metadata = screen.getByTestId('appHeaderMetadata');
      expect(within(metadata).getByText(/Run by/)).toBeInTheDocument();
      // No user_id/user_profile_uid on this fixture, so the run-by name falls back to "Elastic".
      expect(metadata).toHaveTextContent('Elastic');

      expect(screen.getByTestId('result-tabs')).toHaveTextContent('ResultTabs:query-action-456');
      expect(screen.queryByTestId('pack-queries-status-table')).not.toBeInTheDocument();
    });

    it('keeps the run time and shows "-" when the user profile cannot be resolved', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, user_profile_uid: 'profile-1' },
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('appHeaderMetadata')).toHaveTextContent(
        `- on ${formatDate(singleQueryData['@timestamp'])}`
      );
    });

    it('keeps the run time while the user profile is still loading', () => {
      jest
        .mocked(useBulkGetUserProfiles)
        .mockReturnValue({ profilesMap: new Map(), isLoading: true });
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, user_profile_uid: 'profile-1' },
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      const metadata = screen.getByTestId('appHeaderMetadata');
      expect(metadata).toHaveTextContent(`on ${formatDate(singleQueryData['@timestamp'])}`);
      expect(metadata).not.toHaveTextContent('-');
    });

    it('shows inline Export/Add tags, a primary Save query action, and an overflow with View in, Add to Case and Add integrations for a fully-permissioned run', async () => {
      renderPage();
      // The app menu is lazy-loaded (`React.lazy`/`Suspense`); waiting for its root settles that
      // before any item is queried, inline or in the overflow popover.
      await openAppMenuOverflow();

      expect(screen.getByTestId('save-query-button')).toBeInTheDocument();
      expect(screen.getByTestId('add-tags-button')).toBeInTheDocument();
      expect(screen.getByTestId('add-tags-button')).not.toBeDisabled();
      // Export results stays off the experimental flag by default.
      expect(screen.queryByTestId('osqueryExportResultsButton')).not.toBeInTheDocument();
      expect(screen.getByTestId('query-details-view-in')).toBeInTheDocument();
      expect(screen.getByTestId('query-details-add-to-case')).toBeInTheDocument();
      expect(screen.getByTestId('query-details-add-to-case')).not.toBeDisabled();
      expect(screen.getByTestId('osqueryAddIntegrationsMenuItem')).toHaveAttribute(
        'href',
        '/app/integrations/browse'
      );
    });

    it('shows Export results once the experimental flag is enabled', async () => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

      renderPage();
      await openAppMenuOverflow();

      expect(screen.getByTestId('osqueryExportResultsButton')).toBeInTheDocument();
    });

    it('disables Add to Case without loading the cases context when the user lacks full case permissions', async () => {
      setupKibana({ casePermissions: { read: false, update: true, push: true } });

      renderPage();
      await openAppMenuOverflow();

      expect(screen.getByTestId('query-details-add-to-case')).toBeDisabled();
      expect(mockUseKibana().services.cases.ui.getCasesContext).not.toHaveBeenCalled();
    });

    it('hides Add tags entirely when the user lacks writeLiveQueries', async () => {
      setupKibana({ writeLiveQueries: false });

      renderPage();
      await openAppMenuOverflow();

      expect(screen.queryByTestId('add-tags-button')).not.toBeInTheDocument();
      // Sanity check: the menu did settle, it just doesn't include Add tags.
      expect(screen.getByTestId('query-details-add-to-case')).toBeInTheDocument();
    });

    it('hides the primary Save query action when saving is not available', async () => {
      mockUseSaveQueryFromDetails.mockReturnValue({
        ...baseSaveQueryFromDetails,
        canSave: false,
      } as ReturnType<typeof useSaveQueryFromDetails>);

      renderPage();
      await openAppMenuOverflow();

      expect(screen.queryByTestId('save-query-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('add-tags-button')).toBeInTheDocument();
    });

    it('hides View in when the user has neither Discover nor Lens access', async () => {
      setupKibana({ discoverShow: false, lensAvailable: false });

      renderPage();
      await openAppMenuOverflow();

      expect(screen.queryByTestId('query-details-view-in')).not.toBeInTheDocument();
      // Add to Case is unaffected by Discover/Lens access.
      expect(screen.getByTestId('query-details-add-to-case')).toBeInTheDocument();
    });
  });

  describe('pack path', () => {
    it('titles the header with the pack name and shows the "Run by" metadata', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, pack_id: 'pack-1', pack_name: 'forensic-persistence' },
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('forensic-persistence');
      expect(screen.getByTestId('appHeaderMetadata')).toHaveTextContent('Elastic');
      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
      expect(screen.queryByTestId('result-tabs')).not.toBeInTheDocument();
    });

    it('falls back to the "Query results" title when the pack name is unknown', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, pack_id: 'pack-1' },
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Query results');
      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
    });

    it('keeps the "Query results" title when queries.length > 1', () => {
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

      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Query results');
      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
    });

    it('keeps the "Query results" title when queries is empty', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, queries: [] as LiveQueryDetailsItem['queries'] },
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Query results');
      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
    });

    it('keeps the "Query results" title when queries is undefined', () => {
      mockUseLiveQueryDetails.mockReturnValue({
        data: { ...singleQueryData, queries: undefined },
        isLoading: false,
      } as ReturnType<typeof useLiveQueryDetails>);

      renderPage();

      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Query results');
      expect(screen.getByTestId('pack-queries-status-table')).toBeInTheDocument();
    });
  });
});
