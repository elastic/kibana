/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { AiIndexSpendResponse, SpendTotals } from '../../../../common/spend';
import { useAiIndexSpend } from '../../hooks/use_ai_index_spend';
import { SpendPanel } from './spend_panel';

jest.mock('../../hooks/use_ai_index_spend', () => ({
  useAiIndexSpend: jest.fn(),
}));

const mockUseAiIndexSpend = jest.mocked(useAiIndexSpend);

const totals = (costUsd: number, unpricedTokens = 0): SpendTotals => ({
  cost_usd: costUsd,
  unpriced_tokens: unpricedTokens,
  tokens: { input_tokens: 12_000, output_tokens: 3_000, cached_tokens: 0 },
});

const spendResponse = (overrides: Partial<AiIndexSpendResponse> = {}): AiIndexSpendResponse => ({
  ai_index_id: 'my-ai-index',
  period: { start: '2026-10-01T00:00:00.000Z', end: '2026-11-01T00:00:00.000Z' },
  pricing: { source: 'elastic_price_catalog' },
  ai_index: totals(12.5),
  space: totals(45),
  ...overrides,
});

const renderPanel = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <SpendPanel aiIndexId="my-ai-index" />
      </EuiProvider>
    </I18nProvider>
  );

describe('SpendPanel', () => {
  beforeEach(() => {
    mockUseAiIndexSpend.mockReturnValue({
      spend: spendResponse(),
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows month-to-date spend for the index and the space since the start of the month', () => {
    renderPanel();

    expect(screen.getByText(/since Oct 1, 2026/)).toBeInTheDocument();
    const summary = screen.getByTestId('contextAiIndexSpendSummary');
    expect(summary).toHaveTextContent('This AI index: $12.50');
    expect(summary).toHaveTextContent('All AI indices in this space: $45.00');
    expect(summary).toHaveTextContent('15K tokens');
    expect(summary).not.toHaveTextContent('without a known price');
  });

  it('reports the tokens of models without a known price', () => {
    mockUseAiIndexSpend.mockReturnValue({
      spend: spendResponse({ ai_index: totals(1, 400) }),
      isLoading: false,
      error: undefined,
    });

    renderPanel();

    expect(screen.getByTestId('contextAiIndexSpendSummary')).toHaveTextContent(
      '400 from models without a known price'
    );
  });

  it('explains that spend cannot be estimated when prices are unavailable', () => {
    mockUseAiIndexSpend.mockReturnValue({
      spend: spendResponse({ pricing: { source: 'unavailable' } }),
      isLoading: false,
      error: undefined,
    });

    renderPanel();

    expect(screen.getByTestId('contextAiIndexSpendPricesUnavailable')).toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    mockUseAiIndexSpend.mockReturnValue({ spend: undefined, isLoading: true, error: undefined });

    renderPanel();

    expect(screen.getByTestId('contextAiIndexSpendLoading')).toBeInTheDocument();
  });

  it('reports spend that could not be loaded', () => {
    mockUseAiIndexSpend.mockReturnValue({
      spend: undefined,
      isLoading: false,
      error: new Error('Forbidden'),
    });

    renderPanel();

    expect(screen.getByTestId('contextAiIndexSpendError')).toHaveTextContent('Forbidden');
  });
});
