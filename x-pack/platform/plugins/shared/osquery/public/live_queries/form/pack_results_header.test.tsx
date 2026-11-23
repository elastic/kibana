/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PackResultsHeader } from './pack_results_header';
import {
  TestProvidersWithServices,
  createMockKibanaServices,
} from '../../__test_helpers__/create_mock_kibana_services';

const mockAddToCaseWrapper = jest.fn();

jest.mock('../../common/experimental_features_context', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));
jest.mock('../../results/export_filters_context', () => ({
  useExportFilters: jest.fn().mockReturnValue(undefined),
}));
jest.mock('../../results/export_results_button', () => ({
  ExportResultsButton: () => null,
}));
jest.mock('../../cases/add_to_cases', () => ({
  AddToCaseWrapper: (props: Record<string, unknown>) => {
    mockAddToCaseWrapper(props);

    return null;
  },
}));
jest.mock('../../timelines/add_to_timeline_button', () => ({
  AddToTimelineButton: () => null,
}));
jest.mock('../../actions/components/add_tags_flyout', () => ({
  AddTagsFlyout: () => null,
}));
jest.mock('../../actions/use_live_query_details', () => ({
  useLiveQueryDetails: jest.fn().mockReturnValue({ data: undefined }),
}));

const mockUseKibana = jest.fn();

jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
}));

const renderHeader = (props: Partial<Parameters<typeof PackResultsHeader>[0]> = {}) => {
  const services = createMockKibanaServices({
    capabilities: { writeLiveQueries: true } as any,
  });
  mockUseKibana.mockReturnValue({ services });

  return render(
    <TestProvidersWithServices services={services}>
      <PackResultsHeader actionId="action-123" queryIds={['query-1']} {...props} />
    </TestProvidersWithServices>
  );
};

describe('PackResultsHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Add to case', () => {
    it('should forward scheduleId and executionCount for a scheduled execution', () => {
      renderHeader({
        actionId: 'schedule-abc',
        isScheduled: true,
        scheduleId: 'schedule-abc',
        executionCount: 7,
      });

      expect(mockAddToCaseWrapper).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'schedule-abc',
          scheduleId: 'schedule-abc',
          executionCount: 7,
        })
      );
    });

    it('should leave scheduleId and executionCount undefined for a live query', () => {
      renderHeader();

      expect(mockAddToCaseWrapper).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'action-123',
          scheduleId: undefined,
          executionCount: undefined,
        })
      );
    });
  });
});
