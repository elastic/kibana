/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';

import { ScheduledExecutionDetailsPage } from './scheduled_execution_details';
import { useScheduledExecutionDetails } from '../../actions/use_scheduled_execution_details';
import type { ScheduledExecutionDetailsItem } from '../../actions/use_scheduled_execution_details';
import { TestProvidersWithServices } from '../../__test_helpers__/create_mock_kibana_services';

const OSQUERY_DOC_LINK = 'https://docs.elastic.co/solutions/security/investigate/osquery';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ scheduleId: 'schedule-1', executionCount: '1152' }),
}));

jest.mock('../../actions/use_scheduled_execution_details', () => ({
  ...jest.requireActual('../../actions/use_scheduled_execution_details'),
  useScheduledExecutionDetails: jest.fn(),
}));
jest.mock('../../common/hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));
jest.mock('../../common/experimental_features_context', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
  useExperimentalFeatures: jest
    .fn()
    .mockReturnValue({ exportResults: false, rruleScheduling: false, crossProjectSearch: false }),
  ExperimentalFeaturesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
// Lets the "View in" Discover/Lens items resolve their URLs without the real data-view query
// machinery.
jest.mock('../../common/hooks/use_logs_data_view', () => ({
  useLogsDataView: jest.fn().mockReturnValue({ data: { id: 'logs-id', title: 'logs' } }),
}));

const mockResultTabs = jest.fn();
jest.mock('../saved_queries/edit/tabs', () => ({
  ResultTabs: (props: Record<string, unknown>) => {
    mockResultTabs(props);

    return <div data-test-subj="result-tabs" />;
  },
}));

const mockDiscoverGetUrl = jest.fn();
const mockCanUseCases = jest.fn();
const mockOpenCaseModal = jest.fn();
// A plain passthrough stands in for the real `CasesContext` component the `cases` plugin would
// supply via `cases.ui.getCasesContext()` — same pattern already used by other osquery/cases tests.
const MockCasesContext: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
  <>{children}</>
);

const mockUseKibana = jest.fn();
jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
}));

interface SetupKibanaOptions {
  writeLiveQueries?: boolean;
  casePermissions?: { read: boolean; update: boolean; push: boolean };
}

const setupKibana = ({
  writeLiveQueries = true,
  casePermissions = { read: true, update: true, push: true },
}: SetupKibanaOptions = {}) => {
  mockCanUseCases.mockReturnValue(casePermissions);
  mockDiscoverGetUrl.mockResolvedValue('http://localhost/discover');

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
          discover_v2: { show: true },
        },
      },
      cases: {
        helpers: { canUseCases: mockCanUseCases, getRuleIdFromEvent: jest.fn() },
        ui: { getCasesContext: jest.fn().mockReturnValue(MockCasesContext) },
        hooks: {
          useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({ open: mockOpenCaseModal }),
        },
      },
      discover: { locator: { getUrl: mockDiscoverGetUrl } },
      lens: {
        canUseEditor: jest.fn().mockReturnValue(true),
        navigateToPrefilledEditor: jest.fn(),
      },
      notifications: { toasts: { addWarning: jest.fn(), addSuccess: jest.fn() } },
      http: { fetch: jest.fn() },
    },
  });
};

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

const renderPage = () =>
  render(
    <MockAppHeaderProvider>
      <TestProvidersWithServices>
        <ScheduledExecutionDetailsPage />
      </TestProvidersWithServices>
    </MockAppHeaderProvider>
  );

describe('ScheduledExecutionDetailsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibana();
    mockHookResult();
  });

  describe('happy path', () => {
    it('titles the header with the query text, backs to History, and shows the scheduled-run metadata', () => {
      renderPage();

      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('SELECT * FROM processes');
      expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to History');
      expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('href', 'history');

      const metadata = screen.getByTestId('appHeaderMetadata');
      expect(metadata).toHaveTextContent('Scheduled run of');
      expect(metadata).toHaveTextContent('My Pack');
      expect(metadata).toHaveTextContent('Execution');
      expect(metadata).toHaveTextContent('#1152');

      expect(screen.getByTestId('result-tabs')).toBeInTheDocument();
    });

    it('forwards the schedule identity to ResultTabs', () => {
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

    it('brackets the execution timestamp on both sides of the View in window so earlier agent responses are included', async () => {
      renderPage();

      await waitFor(() =>
        expect(mockDiscoverGetUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            timeRange: {
              from: '2026-09-01T11:00:00.000Z',
              to: '2026-09-01T13:00:00.000Z',
              mode: 'absolute',
            },
          })
        )
      );
    });

    it('shows View in and Add to Case in the overflow, a disabled Add tags, and no Save query with full permissions', async () => {
      renderPage();
      await openAppMenuOverflow();

      expect(screen.getByTestId('query-details-view-in')).toBeInTheDocument();
      expect(screen.queryByTestId('save-query-button')).not.toBeInTheDocument();

      expect(screen.getByTestId('add-tags-button')).toBeInTheDocument();
      expect(screen.getByTestId('add-tags-button')).toBeDisabled();

      expect(screen.getByTestId('query-details-add-to-case')).toBeInTheDocument();
      expect(screen.getByTestId('query-details-add-to-case')).not.toBeDisabled();
    });

    it('disables Add to Case when the user lacks full case permissions', async () => {
      setupKibana({ casePermissions: { read: true, update: false, push: true } });

      renderPage();
      await openAppMenuOverflow();

      expect(screen.getByTestId('query-details-add-to-case')).toBeDisabled();
    });

    it('hides Add tags entirely when the user lacks writeLiveQueries', async () => {
      setupKibana({ writeLiveQueries: false });

      renderPage();
      await openAppMenuOverflow();

      expect(screen.queryByTestId('add-tags-button')).not.toBeInTheDocument();
      // Sanity check: the menu did settle, it just doesn't include Add tags.
      expect(screen.getByTestId('query-details-add-to-case')).toBeInTheDocument();
    });

    it('falls back to "Query results" as the title when the pack saved object is gone but hits exist', () => {
      // The scheduled results API resolves the query text from the pack saved object, so a deleted
      // pack (or pack query) leaves only the execution hits.
      mockHookResult({
        data: {
          ...baseDetails,
          packName: '',
          queryName: '',
          queryText: '',
        },
      });

      renderPage();

      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Query results');
      expect(screen.getByTestId('result-tabs')).toBeInTheDocument();
      expect(screen.queryByText('No details for this execution')).not.toBeInTheDocument();
    });
  });

  describe('non-happy-path states', () => {
    it('renders a skeleton header while the request is in flight', () => {
      mockHookResult({ isLoading: true });

      renderPage();

      expect(screen.getByTestId('appHeaderSkeleton')).toBeInTheDocument();
      expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to History');
      expect(screen.queryByTestId('appHeaderTitle')).not.toBeInTheDocument();
    });

    it('renders an empty prompt (and no menu) when there is no execution data', () => {
      mockHookResult({ data: undefined });

      renderPage();

      expect(screen.getByText('No details for this execution')).toBeInTheDocument();
      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Query results');
      expect(screen.queryByTestId('result-tabs')).not.toBeInTheDocument();
    });

    it('renders an empty prompt for a successful response with no recorded hits', () => {
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

      expect(screen.getByText('No details for this execution')).toBeInTheDocument();
    });

    it('renders an error prompt when the request fails', () => {
      mockHookResult({ data: undefined, isError: true });

      renderPage();

      expect(screen.getByText('Unable to load execution details')).toBeInTheDocument();
      expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to History');
    });
  });
});
