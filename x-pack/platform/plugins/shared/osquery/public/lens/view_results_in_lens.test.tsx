/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { ViewResultsInLensAction, getLensAttributes } from './view_results_in_lens';
import { ViewResultsActionButtonType } from '../live_queries/form/pack_queries_status_table';
import { TestProvidersWithServices } from '../__test_helpers__/create_mock_kibana_services';

const mockNavigateToPrefilledEditor = jest.fn();

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

const setupKibana = (lensAvailable = true) => {
  mockUseKibana.mockReturnValue({
    services: {
      lens: {
        canUseEditor: jest.fn().mockReturnValue(lensAvailable),
        navigateToPrefilledEditor: mockNavigateToPrefilledEditor,
      },
      application: {
        capabilities: {
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
    },
  });
};

describe('ViewResultsInLensAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibana();
  });

  describe('visibility', () => {
    it('should render button when Lens is available', () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInLensAction
            actionId="test-action-id"
            buttonType={ViewResultsActionButtonType.button}
          />
        </TestProvidersWithServices>
      );

      expect(screen.getByText('View in Lens')).toBeInTheDocument();
    });

    it('should not render when Lens is not available', () => {
      setupKibana(false);

      const { container } = render(
        <TestProvidersWithServices>
          <ViewResultsInLensAction
            actionId="test-action-id"
            buttonType={ViewResultsActionButtonType.button}
          />
        </TestProvidersWithServices>
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('button types', () => {
    it('should render as button with text when buttonType is button', () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInLensAction
            actionId="test-action-id"
            buttonType={ViewResultsActionButtonType.button}
          />
        </TestProvidersWithServices>
      );

      expect(screen.getByText('View in Lens')).toBeInTheDocument();
    });

    it('should render as icon button when buttonType is icon', () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInLensAction
            actionId="test-action-id"
            buttonType={ViewResultsActionButtonType.icon}
          />
        </TestProvidersWithServices>
      );

      expect(screen.getByLabelText('View in Lens')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should call navigateToPrefilledEditor with correct config on click', () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInLensAction
            actionId="test-action-123"
            buttonType={ViewResultsActionButtonType.button}
            startDate="2025-06-15T10:00:00.000Z"
            endDate="2025-06-15T11:00:00.000Z"
          />
        </TestProvidersWithServices>
      );

      fireEvent.click(screen.getByText('View in Lens'));

      expect(mockNavigateToPrefilledEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '',
          time_range: expect.objectContaining({
            from: '2025-06-15T10:00:00.000Z',
            to: '2025-06-15T11:00:00.000Z',
          }),
          attributes: expect.objectContaining({
            visualizationType: 'lnsPie',
            title: 'Action test-action-123 results',
          }),
        }),
        { openInNewTab: true, skipAppLeave: true }
      );
    });

    it('should use scheduled query filters when scheduleId and executionCount are provided', () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInLensAction
            actionId="test-action-123"
            buttonType={ViewResultsActionButtonType.button}
            scheduleId="schedule-abc"
            executionCount={5}
          />
        </TestProvidersWithServices>
      );

      fireEvent.click(screen.getByText('View in Lens'));

      expect(mockNavigateToPrefilledEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            state: expect.objectContaining({
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
            }),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should use relative time range when no start/end dates provided', () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInLensAction
            actionId="test-action-123"
            buttonType={ViewResultsActionButtonType.button}
          />
        </TestProvidersWithServices>
      );

      fireEvent.click(screen.getByText('View in Lens'));

      expect(mockNavigateToPrefilledEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          time_range: expect.objectContaining({
            from: 'now-1d',
            to: 'now',
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('disabled state', () => {
    it('should be disabled when actionId is not provided', () => {
      render(
        <TestProvidersWithServices>
          <ViewResultsInLensAction buttonType={ViewResultsActionButtonType.button} />
        </TestProvidersWithServices>
      );

      expect(screen.getByText('View in Lens').closest('button')).toBeDisabled();
    });
  });
});

describe('getLensAttributes', () => {
  const mockDataView = { id: 'test-data-view-id', title: 'logs-osquery_manager.result*' };

  it('should generate pie chart visualization attributes', () => {
    const attributes = getLensAttributes(mockDataView as any, { actionId: 'action-1' });

    expect(attributes.visualizationType).toBe('lnsPie');
    expect(attributes.title).toBe('Action action-1 results');
  });

  it('should include action_id filter for live queries', () => {
    const attributes = getLensAttributes(mockDataView as any, { actionId: 'action-1' });

    expect(attributes.state.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          query: { match_phrase: { action_id: 'action-1' } },
        }),
      ])
    );
  });

  it('should include schedule_id and execution_count filters for scheduled queries', () => {
    const attributes = getLensAttributes(mockDataView as any, {
      scheduleId: 'schedule-1',
      executionCount: 3,
    });

    expect(attributes.state.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          query: { match_phrase: { schedule_id: 'schedule-1' } },
        }),
        expect.objectContaining({
          query: { match_phrase: { 'osquery_meta.schedule_execution_count': 3 } },
        }),
      ])
    );
  });

  it('should include agent ID filters when agentIds provided', () => {
    const attributes = getLensAttributes(mockDataView as any, {
      actionId: 'action-1',
      agentIds: ['agent-a', 'agent-b'],
    });

    expect(attributes.state.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          meta: expect.objectContaining({ alias: 'agent IDs' }),
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                { match_phrase: { 'agent.id': 'agent-a' } },
                { match_phrase: { 'agent.id': 'agent-b' } },
              ],
            },
          },
        }),
      ])
    );
  });

  it('should reference the data view in all references', () => {
    const attributes = getLensAttributes(mockDataView as any, { actionId: 'action-1' });

    attributes.references.forEach((ref) => {
      expect(ref.id).toBe('test-data-view-id');
      expect(ref.type).toBe('index-pattern');
    });
  });
});
