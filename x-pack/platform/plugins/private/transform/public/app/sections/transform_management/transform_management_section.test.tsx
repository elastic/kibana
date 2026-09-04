/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { screen, within } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';

import { TransformManagementSection } from './transform_management_section';

jest.mock('../../services/navigation');

const queryClient = new QueryClient();

const mockUseTransformCapabilities = jest.fn();
const mockUseGetTransformNodes = jest.fn();
const mockUseGetTransforms = jest.fn();

jest.mock('../../hooks', () => ({
  useDocumentationLinks: () => ({ esTransform: 'https://example.test' }),
  useTransformCapabilities: () => mockUseTransformCapabilities(),
  useGetTransformNodes: () => mockUseGetTransformNodes(),
  useGetTransforms: () => mockUseGetTransforms(),
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

jest.mock('./components/transform_list', () => ({
  TransformList: ({ transforms }: { transforms: Array<{ id: string }> }) =>
    transforms.length === 0 ? (
      <div data-test-subj="transformNoTransformsFound">
        <button type="button" data-test-subj="transformButtonCreate">
          Create your first transform
        </button>
      </div>
    ) : (
      <div data-test-subj="mockedTransformList" />
    ),
}));

const renderSection = () => {
  const history = createMemoryHistory();
  return renderWithI18n(
    <MockAppHeaderProvider>
      <Router history={history}>
        <QueryClientProvider client={queryClient}>
          <TransformManagementSection />
        </QueryClientProvider>
      </Router>
    </MockAppHeaderProvider>
  );
};

describe('Transform: <TransformManagementSection />', () => {
  beforeEach(() => {
    mockUseGetTransformNodes.mockReturnValue({
      isInitialLoading: false,
      error: null,
      data: 0,
    });
    mockUseGetTransforms.mockReturnValue({
      isInitialLoading: false,
      isLoading: false,
      error: null,
      data: { transforms: [], transformIdsWithoutConfig: [] },
    });
  });

  test('Minimal initialization', () => {
    mockUseTransformCapabilities.mockReturnValue({ canStartStopTransform: true });
    const { container } = renderSection();

    expect(container.textContent).toContain('Missing permission');
  });

  test('keeps AppHeader mounted while loading and hides Create', () => {
    mockUseTransformCapabilities.mockReturnValue({
      canGetTransform: true,
      canCreateTransform: true,
      canPreviewTransform: true,
      canStartStopTransform: true,
    });
    mockUseGetTransformNodes.mockReturnValue({
      isInitialLoading: true,
      error: null,
      data: 0,
    });
    mockUseGetTransforms.mockReturnValue({
      isInitialLoading: true,
      isLoading: true,
      error: null,
      data: { transforms: [], transformIdsWithoutConfig: [] },
    });

    renderSection();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Transforms');
    expect(screen.queryByTestId('transformButtonCreate')).not.toBeInTheDocument();
  });

  test('keeps AppHeader mounted on an empty list and hides Create', () => {
    mockUseTransformCapabilities.mockReturnValue({
      canGetTransform: true,
      canCreateTransform: true,
      canPreviewTransform: true,
      canStartStopTransform: true,
    });
    mockUseGetTransformNodes.mockReturnValue({
      isInitialLoading: false,
      error: null,
      data: 1,
    });

    renderSection();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Transforms');
    expect(
      within(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).queryByTestId(
        'transformButtonCreate'
      )
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('transformNoTransformsFound')).getByTestId('transformButtonCreate')
    ).toBeInTheDocument();
  });

  test('shows Create as the AppHeader primary action when transforms exist', () => {
    mockUseTransformCapabilities.mockReturnValue({
      canGetTransform: true,
      canCreateTransform: true,
      canPreviewTransform: true,
      canStartStopTransform: true,
    });
    mockUseGetTransformNodes.mockReturnValue({
      isInitialLoading: false,
      error: null,
      data: 1,
    });
    mockUseGetTransforms.mockReturnValue({
      isInitialLoading: false,
      isLoading: false,
      error: null,
      data: { transforms: [{ id: 'transform-1' }], transformIdsWithoutConfig: [] },
    });

    renderSection();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Transforms');
    expect(screen.getByTestId('transformButtonCreate')).toBeInTheDocument();
    expect(screen.getByTestId('mockedTransformList')).toBeInTheDocument();
  });
});
