/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { HeaderActions } from './header_actions';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';
import {
  TestProvidersWithServices,
  createMockKibanaServices,
} from '../../../__test_helpers__/create_mock_kibana_services';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';

const mockExportResultsButton = jest.fn();
const mockAddToCaseWrapper = jest.fn();

jest.mock('../../../common/experimental_features_context', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../results/export_filters_context', () => ({
  useExportFilters: jest.fn().mockReturnValue(undefined),
}));
jest.mock('../../../results/export_results_button', () => ({
  ExportResultsButton: (props: Record<string, unknown>) => {
    mockExportResultsButton(props);

    return null;
  },
}));
jest.mock('../../../cases/add_to_cases', () => ({
  AddToCaseWrapper: (props: Record<string, unknown>) => {
    mockAddToCaseWrapper(props);

    return null;
  },
}));
jest.mock('../../../timelines/add_to_timeline_button', () => ({
  AddToTimelineButton: () => null,
}));
jest.mock('./view_in_dropdown', () => ({
  ViewInDropdown: () => null,
}));
jest.mock('../../../actions/use_user_profiles');

const mockUseKibana = jest.fn();

jest.mock('../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
  useRouterNavigate: (path: string) => ({ onClick: jest.fn(), href: path }),
}));

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.MockedFunction<
  typeof useIsExperimentalFeatureEnabled
>;

const baseData: LiveQueryDetailsItem = {
  action_id: 'action-123',
  '@timestamp': '2025-06-15T10:00:00.000Z',
  agent_all: false,
  agent_ids: [],
  agent_platforms: [],
  agent_policy_ids: [],
  agents: ['agent-1', 'agent-2', 'agent-3'],
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

const renderActions = (props: Partial<Parameters<typeof HeaderActions>[0]> = {}) => {
  const services = createMockKibanaServices({
    capabilities: { writeLiveQueries: true } as any,
  });
  mockUseKibana.mockReturnValue({ services });

  return render(
    <TestProvidersWithServices services={services}>
      <HeaderActions actionId="action-123" data={baseData} {...props} />
    </TestProvidersWithServices>
  );
};

describe('HeaderActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
  });

  describe('AddToCaseWrapper', () => {
    it('should forward the queried agent ids so case attachments stay agent-scoped', () => {
      renderActions();

      expect(mockAddToCaseWrapper).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'action-123',
          agentIds: ['agent-1', 'agent-2', 'agent-3'],
        })
      );
    });

    it('should forward undefined agent ids when the action has none', () => {
      renderActions({ data: { ...baseData, agents: undefined } });

      expect(mockAddToCaseWrapper).toHaveBeenCalledWith(
        expect.objectContaining({ agentIds: undefined })
      );
    });
  });

  describe('ExportResultsButton', () => {
    it('should not render when the export feature flag is off', () => {
      renderActions();

      expect(mockExportResultsButton).not.toHaveBeenCalled();
    });

    it('should mark a live query as live and pass the live query id', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

      renderActions();

      expect(mockExportResultsButton).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'query-action-456',
          isLive: true,
          liveQueryId: 'action-123',
          scheduleId: undefined,
          executionCount: undefined,
        })
      );
    });

    it('should mark a scheduled execution as not live and pass schedule id and execution count', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

      renderActions({
        actionId: 'schedule-1',
        data: {
          ...baseData,
          action_id: 'schedule-1',
          queries: [{ ...baseData.queries![0], action_id: 'schedule-1' }],
        },
        scheduleId: 'schedule-1',
        executionCount: 1152,
      });

      expect(mockExportResultsButton).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'schedule-1',
          isLive: false,
          liveQueryId: 'schedule-1',
          scheduleId: 'schedule-1',
          executionCount: 1152,
        })
      );
    });
  });
});
