/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-nocheck

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';

import { TransformManagementSection } from './transform_management_section';

jest.mock('../../services/navigation');

const mockHistoryPush = jest.fn();

jest.mock('../../app_dependencies', () => ({
  useAppDependencies: () => ({
    history: {
      push: mockHistoryPush,
    },
  }),
}));

const mockUseTransformCapabilities = jest.fn();
jest.mock('../../hooks', () => ({
  useDocumentationLinks: () => ({ esTransform: 'http://docs.example.test' }),
  useTransformCapabilities: () => mockUseTransformCapabilities(),
  useGetTransforms: () => ({
    isInitialLoading: false,
    isLoading: false,
    error: null,
    data: { transforms: [], transformIdsWithoutConfig: [] },
  }),
  useGetTransformNodes: () => ({
    isInitialLoading: false,
    error: null,
    data: 1,
  }),
  useGetTransformsStats: () => ({
    isLoading: false,
    error: null,
    data: { transforms: [] },
  }),
}));

jest.mock('../../serverless_context', () => ({
  useEnabledFeatures: () => ({ showNodeInfo: false }),
}));

jest.mock('./components/transform_list', () => ({
  TransformList: ({ onCreateTransform }) => (
    <button data-test-subj="mockCreateTransformButton" onClick={onCreateTransform}>
      Create transform
    </button>
  ),
}));

jest.mock('./components/transform_list/transforms_stats_bar', () => ({
  TransformStatsBar: () => null,
}));

jest.mock('./components/dangling_task_warning/dangling_task_warning', () => ({
  DanglingTasksWarning: () => null,
}));

jest.mock('../../../alerting/transform_alerting_flyout', () => ({
  AlertRulesManageContext: {
    Provider: ({ children }) => <>{children}</>,
  },
  getAlertRuleManageContext: () => ({}),
  TransformAlertFlyoutWrapper: () => null,
}));

const queryClient = new QueryClient();

describe('Transform: <TransformManagementSection />', () => {
  test('Minimal initialization', () => {
    mockUseTransformCapabilities.mockReturnValue({ canGetTransform: false });
    const history = createMemoryHistory();
    const { container } = renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <TransformManagementSection />
        </Router>
      </QueryClientProvider>
    );

    expect(container.textContent).toContain('Missing permission');
  });

  test('navigates directly to create transform flow', () => {
    mockUseTransformCapabilities.mockReturnValue({ canGetTransform: true });
    mockHistoryPush.mockClear();
    const history = createMemoryHistory();

    const { container, getByTestId } = renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <TransformManagementSection />
        </Router>
      </QueryClientProvider>
    );

    // No pre-wizard modal should exist anymore.
    expect(container.querySelector('[data-test-subj="transformSelectSourceModal"]')).toBeNull();

    fireEvent.click(getByTestId('mockCreateTransformButton'));
    expect(mockHistoryPush).toHaveBeenCalledWith('/create_transform');
  });
});
