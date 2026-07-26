/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent } from '@testing-library/react';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';

import { TransformManagement, TransformManagementSection } from './transform_management_section';

jest.mock('../../services/navigation');

const queryClient = new QueryClient();

const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockUseAppDependencies = jest.fn();

jest.mock('../../app_dependencies', () => ({
  useAppDependencies: () => mockUseAppDependencies(),
}));

jest.mock('../../hooks', () => ({
  useDocumentationLinks: () => ({ esTransform: 'https://example.test' }),
  useTransformCapabilities: () => ({ canStartStopTransform: true }),
  useGetTransformNodes: () => ({
    isInitialLoading: false,
    error: null,
    data: 0,
  }),
  useGetTransforms: () => ({
    isInitialLoading: false,
    isLoading: false,
    error: null,
    data: { transforms: [], transformIdsWithoutConfig: [] },
  }),
}));

jest.mock('../../hooks/use_get_transform_stats', () => ({
  useGetTransformsStats: () => ({
    isLoading: false,
    error: null,
    data: undefined,
  }),
}));

jest.mock('../../serverless_context', () => ({
  useEnabledFeatures: () => ({ showNodeInfo: false }),
}));

jest.mock('../../../alerting/transform_alerting_flyout', () => {
  return {
    AlertRulesManageContext: {
      Provider: ({ children }: { children?: unknown }) => children ?? null,
    },
    getAlertRuleManageContext: () => ({}),
    TransformAlertFlyoutWrapper: () => null,
  };
});

jest.mock('./components/transform_list/transforms_stats_bar', () => ({
  TransformStatsBar: () => null,
}));

jest.mock('./components/dangling_task_warning/dangling_task_warning', () => ({
  DanglingTasksWarning: () => null,
}));

describe('Transform: <TransformManagementSection />', () => {
  beforeEach(() => {
    mockStorage.get.mockReset();
    mockStorage.set.mockReset();
    mockUseAppDependencies.mockReset();
    mockUseAppDependencies.mockReturnValue({
      dataViewEditor: undefined,
      cps: { cpsManager: {} },
      storage: mockStorage,
    });
  });

  test('Minimal initialization', () => {
    const { container } = renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <TransformManagementSection />
      </QueryClientProvider>
    );

    expect(container.textContent).toContain('Missing permission');
  });

  test('Shows CPS unsupported callout when CPS is enabled and allows dismissing it', () => {
    mockStorage.get.mockReturnValue(false);
    const history = createMemoryHistory({ initialEntries: ['/'] });

    const { container } = renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <UrlStateProvider>
            <TransformManagement />
          </UrlStateProvider>
        </Router>
      </QueryClientProvider>
    );

    expect(
      container.querySelector('[data-test-subj="transformCpsUnsupportedCallout"]')
    ).not.toBeNull();

    const dismissButton = container.querySelector(
      '[data-test-subj="transformCpsUnsupportedCalloutDismiss"]'
    ) as HTMLButtonElement | null;
    expect(dismissButton).not.toBeNull();

    fireEvent.click(dismissButton!);
    expect(mockStorage.set).toHaveBeenCalledWith('transform.cpsUnsupportedCalloutDismissed', true);
    expect(container.querySelector('[data-test-subj="transformCpsUnsupportedCallout"]')).toBeNull();
  });

  test('Does not show CPS unsupported callout when dismissed in storage', () => {
    mockStorage.get.mockReturnValue(true);
    const history = createMemoryHistory({ initialEntries: ['/'] });

    const { container } = renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <UrlStateProvider>
            <TransformManagement />
          </UrlStateProvider>
        </Router>
      </QueryClientProvider>
    );

    expect(container.querySelector('[data-test-subj="transformCpsUnsupportedCallout"]')).toBeNull();
  });

  test('Does not show CPS unsupported callout when CPS is not enabled', () => {
    mockUseAppDependencies.mockReturnValue({
      dataViewEditor: undefined,
      cps: undefined,
      storage: mockStorage,
    });
    const history = createMemoryHistory({ initialEntries: ['/'] });

    const { container } = renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <UrlStateProvider>
            <TransformManagement />
          </UrlStateProvider>
        </Router>
      </QueryClientProvider>
    );

    expect(container.querySelector('[data-test-subj="transformCpsUnsupportedCallout"]')).toBeNull();
  });
});
