/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { TransformManagementSection } from './transform_management_section';

jest.mock('../../services/navigation');

const queryClient = new QueryClient();

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
  test('Minimal initialization', () => {
    const { container } = renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <TransformManagementSection />
      </QueryClientProvider>
    );

    expect(container.textContent).toContain('Missing permission');
  });
});
