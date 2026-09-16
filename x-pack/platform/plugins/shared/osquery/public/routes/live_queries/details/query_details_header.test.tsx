/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryDetailsHeader } from './query_details_header';
import { useBulkGetUserProfiles } from '../../../actions/use_user_profiles';
import {
  TestProvidersWithServices,
  createMockKibanaServices,
} from '../../../__test_helpers__/create_mock_kibana_services';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';

jest.mock('../../../actions/use_user_profiles');
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
}));
jest.mock('../../../timelines/add_to_timeline_button', () => ({
  AddToTimelineButton: () => null,
}));
jest.mock('../../../cases/add_to_cases', () => ({
  AddToCaseWrapper: () => null,
}));

const mockUseBulkGetUserProfiles = useBulkGetUserProfiles as jest.MockedFunction<
  typeof useBulkGetUserProfiles
>;

const mockUseKibana = jest.fn();

jest.mock('../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
  useRouterNavigate: (path: string) => ({ onClick: jest.fn(), href: path }),
}));

const baseData: LiveQueryDetailsItem = {
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
  tags: [],
};

const setupKibana = (capabilities: Record<string, unknown> = {}) => {
  const services = createMockKibanaServices({
    capabilities: { writeLiveQueries: true, ...capabilities } as any,
  });
  mockUseKibana.mockReturnValue({ services });
};

const renderHeader = (props: Partial<Parameters<typeof QueryDetailsHeader>[0]> = {}) => {
  setupKibana();
  const services = createMockKibanaServices();

  return render(
    <TestProvidersWithServices services={services}>
      <QueryDetailsHeader actionId="action-123" data={baseData} {...props} />
    </TestProvidersWithServices>
  );
};

describe('QueryDetailsHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBulkGetUserProfiles.mockReturnValue({
      profilesMap: new Map(),
      isLoading: false,
    });
  });

  describe('title', () => {
    it('renders the query text with multilines removed', () => {
      renderHeader({
        data: {
          ...baseData,
          queries: [{ ...baseData.queries![0], query: 'SELECT *\nFROM processes' }],
        },
      });

      expect(screen.getByTestId('query-details-title')).toHaveTextContent(
        'SELECT * FROM processes'
      );
    });
  });

  describe('Run-by subtitle', () => {
    it('renders "Elastic" when both user_id and user_profile_uid are absent', () => {
      renderHeader();

      expect(screen.getByTestId('query-details-run-by')).toHaveTextContent('Elastic');
    });

    it('renders user avatar cell when profilesMap has the uid', () => {
      const profilesMap = new Map([
        [
          'uid-1',
          {
            uid: 'uid-1',
            user: { full_name: 'Jane Doe', username: 'jane.doe' },
          } as any,
        ],
      ]);
      mockUseBulkGetUserProfiles.mockReturnValue({ profilesMap, isLoading: false });

      renderHeader({ data: { ...baseData, user_id: 'jane.doe', user_profile_uid: 'uid-1' } });

      expect(screen.getByTestId('query-details-run-by')).toHaveTextContent('Jane Doe');
    });
  });

  describe('Save query button', () => {
    it('is hidden when onSaveQuery is not passed', () => {
      renderHeader({ onSaveQuery: undefined });

      expect(screen.queryByTestId('save-query-button')).not.toBeInTheDocument();
    });

    it('is rendered when onSaveQuery is provided', () => {
      renderHeader({ onSaveQuery: jest.fn() });

      expect(screen.getByTestId('save-query-button')).toBeInTheDocument();
    });
  });

  describe('Add tags button', () => {
    it('is hidden without writeLiveQueries permission', () => {
      setupKibana({ writeLiveQueries: false });
      const services = createMockKibanaServices({ capabilities: { writeLiveQueries: false } });
      render(
        <TestProvidersWithServices services={services}>
          <QueryDetailsHeader actionId="action-123" data={baseData} />
        </TestProvidersWithServices>
      );

      expect(screen.queryByTestId('add-tags-button')).not.toBeInTheDocument();
    });

    it('is shown with writeLiveQueries permission', () => {
      setupKibana({ writeLiveQueries: true });
      const services = createMockKibanaServices({ capabilities: { writeLiveQueries: true } });
      render(
        <TestProvidersWithServices services={services}>
          <QueryDetailsHeader actionId="action-123" data={baseData} />
        </TestProvidersWithServices>
      );

      expect(screen.getByTestId('add-tags-button')).toBeInTheDocument();
    });
  });

  describe('Export button', () => {
    it('is hidden when exportResults flag is off', () => {
      renderHeader();

      expect(screen.queryByText('Export')).not.toBeInTheDocument();
    });

    it('is shown when exportResults flag is on', () => {
      const { useIsExperimentalFeatureEnabled } = jest.requireMock(
        '../../../common/experimental_features_context'
      );
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

      renderHeader();

      const exportBtn = screen.queryByText(/export/i);
      expect(exportBtn).not.toBeNull();

      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    });
  });
  describe('scheduled execution variant', () => {
    const scheduledProps = {
      scheduleId: 'schedule-1',
      executionCount: 7,
      packName: 'My Pack',
    };

    it('renders the scheduled-run subtitle instead of Run-by', () => {
      renderHeader(scheduledProps);

      expect(screen.getByTestId('query-details-scheduled-run')).toBeInTheDocument();
      expect(screen.queryByTestId('query-details-run-by')).not.toBeInTheDocument();
    });

    it('includes the pack name and execution number in the subtitle', () => {
      renderHeader(scheduledProps);

      const subtitle = screen.getByTestId('query-details-scheduled-run');
      expect(subtitle).toHaveTextContent('My Pack');
      expect(subtitle).toHaveTextContent('7');
    });

    it('omits the pack name when it is unavailable', () => {
      renderHeader({ ...scheduledProps, packName: undefined });

      const subtitle = screen.getByTestId('query-details-scheduled-run');
      expect(subtitle).toHaveTextContent('Scheduled run');
      expect(subtitle).not.toHaveTextContent('My Pack');
    });

    it('disables Add tags for scheduled executions', () => {
      renderHeader(scheduledProps);

      expect(screen.getByTestId('add-tags-button')).toBeDisabled();
    });

    it('keeps Add tags enabled for live queries', () => {
      renderHeader();

      expect(screen.getByTestId('add-tags-button')).not.toBeDisabled();
    });

    it('hides Save query when no onSaveQuery handler is provided', () => {
      renderHeader(scheduledProps);

      expect(screen.queryByTestId('save-query-button')).not.toBeInTheDocument();
    });

    it('still renders the query title', () => {
      renderHeader(scheduledProps);

      expect(screen.getByTestId('query-details-title')).toHaveTextContent(
        'SELECT * FROM processes'
      );
    });
  });

  describe('back navigation', () => {
    it('does not render its own back-to-history control', () => {
      renderHeader();

      expect(screen.queryByTestId('query-details-back-to-history')).not.toBeInTheDocument();
    });

    it('does not render a back-to-history control for scheduled executions either', () => {
      renderHeader({ scheduleId: 'schedule-1', executionCount: 7, packName: 'My Pack' });

      expect(screen.queryByTestId('query-details-back-to-history')).not.toBeInTheDocument();
    });
  });
  describe('execution count formatting', () => {
    it('should not locale-format a high execution count', () => {
      renderHeader({ scheduleId: 'schedule-1', executionCount: 1152, packName: 'My Pack' });

      const subtitle = screen.getByTestId('query-details-scheduled-run');
      expect(subtitle).toHaveTextContent('Execution #1152');
      expect(subtitle).not.toHaveTextContent('Execution #1,152');
    });
  });

  describe('long query titles', () => {
    const longQuery = `SELECT ${'a'.repeat(400)} FROM processes`;

    it('trims the rendered title but keeps the full query in the tooltip', () => {
      renderHeader({
        data: { ...baseData, queries: [{ ...baseData.queries![0], query: longQuery }] },
      });

      const title = screen.getByTestId('query-details-title');
      expect(title.textContent!.length).toBeLessThanOrEqual(61);
      expect(title.textContent).toMatch(/\u2026$/);
      expect(title).toHaveAttribute('title', longQuery);
    });

    it('leaves a short query untrimmed and adds no ellipsis', () => {
      renderHeader();

      const title = screen.getByTestId('query-details-title');
      expect(title).toHaveTextContent('SELECT * FROM processes');
      expect(title.textContent).not.toMatch(/\u2026/);
    });
  });
});
