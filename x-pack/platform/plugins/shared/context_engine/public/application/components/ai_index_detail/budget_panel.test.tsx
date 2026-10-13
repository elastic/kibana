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
import type { AiIndexBudgetStatusResponse, BucketBudgetStatus } from '../../../../common/budgets';
import { useAiIndexBudget } from '../../hooks/use_ai_index_budget';
import { BudgetPanel } from './budget_panel';

const mockMutate = jest.fn();

jest.mock('../../hooks/use_ai_index_budget', () => ({
  useAiIndexBudget: jest.fn(),
  useSaveAiIndexBudget: () => ({ mutate: mockMutate, isLoading: false }),
}));

const mockUseAiIndexBudget = jest.mocked(useAiIndexBudget);

const bucket = (
  costUsd: number,
  limitUsd: number | undefined,
  state: BucketBudgetStatus['state'],
  unpricedTokens = 0
): BucketBudgetStatus => ({
  ...(limitUsd !== undefined && { limit_usd: limitUsd }),
  spend: {
    cost_usd: costUsd,
    unpriced_tokens: unpricedTokens,
    tokens: { input_tokens: 12_000, output_tokens: 3_000, cached_tokens: 0 },
  },
  state,
});

const status = (
  overrides: Partial<AiIndexBudgetStatusResponse> = {}
): AiIndexBudgetStatusResponse => ({
  ai_index_id: 'my-ai-index',
  period: { start: '2026-10-01T00:00:00.000Z', end: '2026-11-01T00:00:00.000Z' },
  pricing: { source: 'elastic_price_catalog' },
  config: { automations_monthly_usd: 50 },
  cost_tier: 'medium',
  ai_index: {
    automations: bucket(12.5, 50, 'ok'),
    suggestions: bucket(1, undefined, 'unlimited', 400),
  },
  space: {
    automations: bucket(45, 50, 'warning'),
    suggestions: bucket(4, 20, 'ok'),
  },
  ...overrides,
});

const renderPanel = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <BudgetPanel aiIndexId="my-ai-index" />
      </EuiProvider>
    </I18nProvider>
  );

describe('BudgetPanel', () => {
  beforeEach(() => {
    mockUseAiIndexBudget.mockReturnValue({ budget: status(), isLoading: false, error: undefined });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows month-to-date spend for the index and the space, and the reset date', () => {
    renderPanel();

    expect(screen.getByText(/resumes on Nov 1, 2026/)).toBeInTheDocument();
    const automations = screen.getByTestId('contextAiIndexBudget-automations');
    expect(automations).toHaveTextContent('This AI index: $12.50 of $50.00');
    expect(automations).toHaveTextContent('All AI indices in this space: $45.00 of $50.00');
    expect(screen.getByTestId('contextAiIndexBudgetState-automations')).toHaveTextContent(
      'Nearly spent'
    );
    expect(screen.getByTestId('contextAiIndexBudget-suggestions')).toHaveTextContent(
      'This AI index: $1.00 spent, no limit'
    );
    expect(screen.getByTestId('contextAiIndexBudget-suggestions')).toHaveTextContent(
      '400 from models without a known price'
    );
  });

  it('saves the edited limits and cost tier', () => {
    renderPanel();

    expect(screen.getByTestId('contextAiIndexBudgetSave')).toBeDisabled();
    fireEvent.change(screen.getByTestId('contextAiIndexBudgetLimit-suggestions_monthly_usd'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByText('Cheap'));
    fireEvent.click(screen.getByTestId('contextAiIndexBudgetSave'));

    expect(mockMutate).toHaveBeenCalledWith({
      automations_monthly_usd: 50,
      suggestions_monthly_usd: 5,
      cost_tier: 'cheap',
    });
  });

  it('clears a limit when its field is emptied', () => {
    renderPanel();

    fireEvent.change(screen.getByTestId('contextAiIndexBudgetLimit-automations_monthly_usd'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByTestId('contextAiIndexBudgetSave'));

    expect(mockMutate).toHaveBeenCalledWith({ cost_tier: 'medium' });
  });

  it('refuses to save a negative limit', () => {
    renderPanel();

    fireEvent.change(screen.getByTestId('contextAiIndexBudgetLimit-automations_monthly_usd'), {
      target: { value: '-1' },
    });

    expect(screen.getByTestId('contextAiIndexBudgetSave')).toBeDisabled();
  });

  it('explains that limits are not enforced when prices are unavailable', () => {
    mockUseAiIndexBudget.mockReturnValue({
      budget: status({ pricing: { source: 'unavailable' } }),
      isLoading: false,
      error: undefined,
    });

    renderPanel();

    expect(screen.getByTestId('contextAiIndexBudgetPricesUnavailable')).toBeInTheDocument();
  });

  it('reports a budget that could not be loaded', () => {
    mockUseAiIndexBudget.mockReturnValue({
      budget: undefined,
      isLoading: false,
      error: new Error('Forbidden'),
    });

    renderPanel();

    expect(screen.getByTestId('contextAiIndexBudgetError')).toHaveTextContent('Forbidden');
  });
});
