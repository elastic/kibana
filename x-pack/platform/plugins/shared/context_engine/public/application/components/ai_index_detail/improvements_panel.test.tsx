/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import {
  DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  MAX_IMPROVEMENTS_PAGE_SIZE,
} from '../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { IMPROVEMENT_STATUSES } from '../../../../common/http_api/improvements';
import { useFeedbackLoopEnabled } from '../../hooks/use_feedback_loop_enabled';
import { useImprovements } from '../../hooks/use_improvements';
import { useApproveImprovement, useRejectImprovement } from '../../hooks/use_resolve_improvement';
import { ImprovementsPanel } from './improvements_panel';
import { buildImprovement } from './improvement_test_fixtures';

jest.mock('../../hooks/use_feedback_loop_enabled', () => ({ useFeedbackLoopEnabled: jest.fn() }));
jest.mock('../../hooks/use_improvements', () => ({ useImprovements: jest.fn() }));
jest.mock('../../hooks/use_resolve_improvement', () => ({
  useApproveImprovement: jest.fn(),
  useRejectImprovement: jest.fn(),
}));

const mockUseFeedbackLoopEnabled = jest.mocked(useFeedbackLoopEnabled);
const mockUseImprovements = jest.mocked(useImprovements);
const mockUseApproveImprovement = jest.mocked(useApproveImprovement);
const mockUseRejectImprovement = jest.mocked(useRejectImprovement);

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const improvementsResult = (overrides = {}) => ({
  improvements: [],
  total: 0,
  isLoading: false,
  error: undefined,
  refetch: jest.fn(),
  ...overrides,
});

const mutationResult = (overrides: { mutate?: jest.Mock; isLoading?: boolean } = {}) =>
  ({
    mutate: jest.fn(),
    isLoading: false,
    variables: undefined,
    ...overrides,
  } as unknown as ReturnType<typeof useApproveImprovement>);

const renderPanel = (args: { isLoading?: boolean; index?: GetAiIndexResponse } = {}): void => {
  const { isLoading = false } = args;
  const index = 'index' in args ? args.index : aiIndex;
  render(
    <I18nProvider>
      <EuiProvider>
        <ImprovementsPanel isLoading={isLoading} aiIndex={index} />
      </EuiProvider>
    </I18nProvider>
  );
};

describe('ImprovementsPanel', () => {
  beforeEach(() => {
    mockUseFeedbackLoopEnabled.mockReturnValue(true);
    mockUseImprovements.mockReturnValue(improvementsResult());
    mockUseApproveImprovement.mockReturnValue(mutationResult());
    mockUseRejectImprovement.mockReturnValue(mutationResult());
  });

  afterEach(() => jest.clearAllMocks());

  it('renders nothing when the feedback loop is disabled', () => {
    mockUseFeedbackLoopEnabled.mockReturnValue(false);
    renderPanel();
    expect(screen.queryByTestId('contextImprovementsPanel')).not.toBeInTheDocument();
  });

  it('shows the loading skeleton while the AI index loads', () => {
    renderPanel({ isLoading: true });
    expect(screen.getByTestId('contextImprovementsLoading')).toBeInTheDocument();
  });

  it('asks for the suggestions still awaiting review by default', () => {
    renderPanel();

    expect(mockUseImprovements).toHaveBeenCalledWith(
      expect.objectContaining({ aiIndexId: 'my-ai-index', status: undefined })
    );
    expect(screen.getByTestId('contextImprovementsEmpty')).toHaveTextContent(
      'Nothing awaiting review'
    );
  });

  it('adds the resolved suggestions when history is switched on', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('contextImprovementsHistorySwitch'));

    expect(mockUseImprovements).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: IMPROVEMENT_STATUSES })
    );
    expect(screen.getByTestId('contextImprovementsEmpty')).toHaveTextContent('No suggestions yet');
  });

  it('lists the suggestions and resolves the one that was acted on', () => {
    const approve = jest.fn();
    const reject = jest.fn();
    mockUseApproveImprovement.mockReturnValue(mutationResult({ mutate: approve }));
    mockUseRejectImprovement.mockReturnValue(mutationResult({ mutate: reject }));
    mockUseImprovements.mockReturnValue(
      improvementsResult({
        improvements: [
          buildImprovement(),
          buildImprovement({ improvement_id: 'imp-2', title: 'Retire the stale FAQ' }),
        ],
        total: 2,
      })
    );
    renderPanel();

    expect(screen.getAllByTestId('contextImprovementRow')).toHaveLength(2);

    fireEvent.click(screen.getAllByTestId('contextImprovementApproveButton')[1]);
    expect(approve).toHaveBeenCalledWith('imp-2');

    fireEvent.click(screen.getAllByTestId('contextImprovementRejectButton')[0]);
    expect(reject).toHaveBeenCalledWith('imp-1');
  });

  it('stops a second approval from racing the one in flight', () => {
    mockUseApproveImprovement.mockReturnValue(mutationResult({ isLoading: true }));
    mockUseImprovements.mockReturnValue(
      improvementsResult({
        improvements: [buildImprovement(), buildImprovement({ improvement_id: 'imp-2' })],
        total: 2,
      })
    );
    renderPanel();

    for (const button of screen.getAllByTestId('contextImprovementApproveButton')) {
      expect(button).toBeDisabled();
    }
  });

  it('reports the error state instead of an empty list when the query fails', () => {
    mockUseImprovements.mockReturnValue(improvementsResult({ error: new Error('boom') }));
    renderPanel();

    expect(screen.getByTestId('contextSignalsError')).toBeInTheDocument();
    expect(screen.queryByTestId('contextImprovementsEmpty')).not.toBeInTheDocument();
  });

  it('offers more when the list is truncated, up to the per-request cap', () => {
    mockUseImprovements.mockReturnValue(
      improvementsResult({ improvements: [buildImprovement()], total: 60 })
    );
    renderPanel();

    expect(screen.getByTestId('contextImprovementsTruncated')).toHaveTextContent('Showing 1 of 60');

    fireEvent.click(screen.getByTestId('contextImprovementsLoadMore'));

    expect(mockUseImprovements).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: DEFAULT_IMPROVEMENTS_PAGE_SIZE * 2 })
    );
  });

  it('never asks for more than the route accepts', () => {
    mockUseImprovements.mockReturnValue(
      improvementsResult({
        improvements: [buildImprovement()],
        total: MAX_IMPROVEMENTS_PAGE_SIZE + 10,
      })
    );
    renderPanel();

    const pages = Math.ceil(MAX_IMPROVEMENTS_PAGE_SIZE / DEFAULT_IMPROVEMENTS_PAGE_SIZE);
    for (let page = 1; page < pages; page++) {
      fireEvent.click(screen.getByTestId('contextImprovementsLoadMore'));
    }

    expect(mockUseImprovements).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: MAX_IMPROVEMENTS_PAGE_SIZE })
    );
    expect(screen.queryByTestId('contextImprovementsLoadMore')).not.toBeInTheDocument();
  });

  it('waits for the AI index before querying', () => {
    renderPanel({ index: undefined });

    expect(mockUseImprovements).toHaveBeenCalledWith(
      expect.objectContaining({ aiIndexId: undefined })
    );
  });
});
