/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { PackResultsHeader } from './pack_results_header';
import {
  TestProvidersWithServices,
  createMockKibanaServices,
} from '../../__test_helpers__/create_mock_kibana_services';

const mockAddToCaseWrapper = vi.fn();

vi.mock('../../common/experimental_features_context', () => {
  const mocked = {
    useIsExperimentalFeatureEnabled: vi.fn().mockReturnValue(false),
  };

  return { ...mocked, default: mocked };
});
vi.mock('../../results/export_filters_context', () => {
  const mocked = {
    useExportFilters: vi.fn().mockReturnValue(undefined),
  };

  return { ...mocked, default: mocked };
});
vi.mock('../../results/export_results_button', () => {
  const mocked = {
    ExportResultsButton: () => null,
  };

  return { ...mocked, default: mocked };
});
vi.mock('../../cases/add_to_cases', () => {
  const mocked = {
    AddToCaseWrapper: (props: Record<string, unknown>) => {
      mockAddToCaseWrapper(props);

      return null;
    },
  };

  return { ...mocked, default: mocked };
});
vi.mock('../../timelines/add_to_timeline_button', () => {
  const mocked = {
    AddToTimelineButton: () => null,
  };

  return { ...mocked, default: mocked };
});
vi.mock('../../actions/components/add_tags_flyout', () => {
  const mocked = {
    AddTagsFlyout: () => null,
  };

  return { ...mocked, default: mocked };
});
vi.mock('../../actions/use_live_query_details', () => {
  const mocked = {
    useLiveQueryDetails: vi.fn().mockReturnValue({ data: undefined }),
  };

  return { ...mocked, default: mocked };
});

const mockUseKibana = vi.fn();

vi.mock('../../common/lib/kibana', async () => {
  const mocked = {
    ...(await vi.importActual('../../common/lib/kibana')),
    useKibana: () => mockUseKibana(),
  };

  return { ...mocked, default: mocked };
});

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
    vi.clearAllMocks();
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
