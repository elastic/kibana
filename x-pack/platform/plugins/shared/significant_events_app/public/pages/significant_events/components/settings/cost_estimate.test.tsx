/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { BehaviorSubject } from 'rxjs';
import type {
  BudgetGroupCost,
  CostCaveat,
  CostResponse,
  CostStatus,
  PeriodCost,
  RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import { useKibana } from '../../../../hooks/use_kibana';
import { useGenAiSettingsUrl } from '../../../../hooks/use_gen_ai_settings_url';
import { useSignificantEventsCost } from '../../../../hooks/use_significant_events_cost';
import { useRunQuotas } from '../../../../hooks/use_significant_events_run_quotas';
import { CostEstimate } from './cost_estimate';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_gen_ai_settings_url');
jest.mock('../../../../hooks/use_significant_events_cost');
jest.mock('../../../../hooks/use_significant_events_run_quotas');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseGenAiSettingsUrl = useGenAiSettingsUrl as jest.MockedFunction<
  typeof useGenAiSettingsUrl
>;
const mockUseSignificantEventsCost = useSignificantEventsCost as jest.MockedFunction<
  typeof useSignificantEventsCost
>;
const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;

const refreshCost = jest.fn();
const retryCost = jest.fn();

const quotasResponse = (canManage: boolean): RunQuotasResponse => ({
  enabled: true,
  limits: { detection: 1, investigation: 1, ki_extraction: 1 },
  counts: { detection: 0, investigation: 0, ki_extraction: 0 },
  window: {
    start: '2026-09-09T00:00:00.000Z',
    resetsAt: '2026-09-10T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage,
});

const group = (
  name: BudgetGroupCost['group'],
  overrides: Partial<BudgetGroupCost> = {}
): BudgetGroupCost => ({
  group: name,
  status: 'complete',
  estimatedCost: 1,
  totalTokens: 10,
  priceableTokens: 10,
  unpriceableTokens: 0,
  tierCrossingCount: 0,
  ...overrides,
});

const period = (label: PeriodCost['label'], overrides: Partial<PeriodCost> = {}): PeriodCost => ({
  label,
  periodStart: label === 'today' ? '2026-09-09T00:00:00.000Z' : '2026-09-01T00:00:00.000Z',
  periodEnd: '2026-09-09T15:04:00.000Z',
  groups: [
    group('detection', { estimatedCost: 1.2, totalTokens: 12 }),
    group('investigation', { estimatedCost: 2.3, totalTokens: 23 }),
    group('ki_extraction', { estimatedCost: 3.4, totalTokens: 34 }),
    group('memory', { estimatedCost: 4.5, totalTokens: 45 }),
  ],
  totalEstimatedCost: 11.4,
  totalStatus: 'complete',
  totalTokens: 114,
  unknownFeatureTokens: 0,
  unknownFeatureDocCount: 0,
  ...overrides,
});

const ALWAYS_CAVEATS: CostCaveat[] = [
  'eis_pricing_assumed',
  'usd_assumed',
  'excludes_embeddings',
  'excludes_failed_calls',
  'excludes_cache_writes',
  'tracking_not_all_spaces',
];

const costResponse = (overrides: Partial<CostResponse> = {}): CostResponse => ({
  today: period('today'),
  month: period('this_month', { totalEstimatedCost: 20.5, totalTokens: 200 }),
  asOf: '2026-09-09T15:04:00.000Z',
  pricesFetchedAt: '2026-09-09T06:00:00.000Z',
  pricesStale: false,
  unavailableReason: null,
  caveats: ALWAYS_CAVEATS,
  ...overrides,
});

const setTracking = (enabled: boolean) => {
  const tracking$ = new BehaviorSubject(enabled);
  mockUseKibana.mockReturnValue({
    core: {
      settings: {
        client: {
          get: jest.fn().mockReturnValue(enabled),
          get$: jest.fn().mockReturnValue(tracking$),
        },
      },
    },
  } as never);
};

const setCost = (value: Partial<ReturnType<typeof useSignificantEventsCost>> = {}) => {
  mockUseSignificantEventsCost.mockReturnValue({
    data: costResponse(),
    isLoading: false,
    isRefreshing: false,
    error: null,
    refreshCost,
    retryCost,
    ...value,
  } as never);
};

const renderCost = () =>
  render(
    <I18nProvider>
      <CostEstimate />
    </I18nProvider>
  );

describe('CostEstimate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenAiSettingsUrl.mockReturnValue('/app/management/ai/genAiSettings');
    mockUseRunQuotas.mockReturnValue({
      data: quotasResponse(true),
      isLoading: false,
      isError: false,
    } as never);
    setTracking(true);
    setCost();
  });

  it('is hidden while privilege is unknown', () => {
    mockUseRunQuotas.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);
    renderCost();
    expect(screen.queryByTestId('significantEventsCostSection')).not.toBeInTheDocument();
  });

  it('is hidden for canManage false', () => {
    mockUseRunQuotas.mockReturnValue({
      data: quotasResponse(false),
      isLoading: false,
      isError: false,
    } as never);
    renderCost();
    expect(screen.queryByTestId('significantEventsCostSection')).not.toBeInTheDocument();
  });

  it('is hidden when the run-quota query errors', () => {
    mockUseRunQuotas.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);
    renderCost();
    expect(screen.queryByTestId('significantEventsCostSection')).not.toBeInTheDocument();
  });

  it('shows the tracking prompt and Gen AI Settings link when tracking is disabled', () => {
    setTracking(false);
    renderCost();
    expect(screen.getByTestId('significantEventsCostTrackingPrompt')).toHaveTextContent(
      'Enable token usage tracking to see cost estimates'
    );
    expect(screen.getByTestId('significantEventsCostGenAiSettingsLink')).toHaveAttribute(
      'href',
      '/app/management/ai/genAiSettings'
    );
    expect(mockUseSignificantEventsCost).toHaveBeenCalledWith({ enabled: false });
    expect(mockUseKibana().core.settings.client.get).toHaveBeenCalledWith(
      GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING,
      false
    );
  });

  it('shows a loading spinner on the initial query', () => {
    setCost({ data: undefined, isLoading: true });
    renderCost();
    expect(screen.getByTestId('significantEventsCostLoading')).toBeInTheDocument();
  });

  it('renders the headline, both group columns, fixed order, and numeric formatting', () => {
    renderCost();
    expect(screen.getByTestId('significantEventsCostHeadline')).toHaveTextContent(
      '~$11.40 today · ~$20.50 this month (recorded calls)'
    );
    const groups = screen.getAllByTestId(/^significantEventsCostGroup-/);
    expect(groups.map((node) => node.getAttribute('data-test-subj'))).toEqual([
      'significantEventsCostGroup-detection',
      'significantEventsCostGroup-investigation',
      'significantEventsCostGroup-ki_extraction',
      'significantEventsCostGroup-memory',
    ]);
    expect(screen.getByText('Detection')).toBeInTheDocument();
    expect(screen.getByText('Investigation')).toBeInTheDocument();
    expect(screen.getByText('KI extraction')).toBeInTheDocument();
    expect(screen.getByText('Memory')).toBeInTheDocument();
    expect(screen.getByTestId('significantEventsCostGroupToday-detection')).toHaveTextContent(
      '~$1.20'
    );
    expect(screen.getByTestId('significantEventsCostGroupMonth-memory')).toHaveTextContent(
      '~$4.50'
    );
  });

  it('keeps a partial numeric floor visible', () => {
    setCost({
      data: costResponse({
        today: period('today', {
          groups: [
            group('detection', {
              status: 'partial' as CostStatus,
              estimatedCost: 1.2,
              unpriceableTokens: 4,
            }),
            group('investigation', { estimatedCost: 0, totalTokens: 0 }),
            group('ki_extraction', { estimatedCost: 0, totalTokens: 0 }),
            group('memory', { estimatedCost: 0, totalTokens: 0 }),
          ],
          totalEstimatedCost: 1.2,
          totalStatus: 'partial',
        }),
      }),
    });
    renderCost();
    expect(screen.getByTestId('significantEventsCostGroupToday-detection')).toHaveTextContent(
      '~$1.20'
    );
    expect(
      screen.getByTestId('significantEventsCostPartialBadge-detection-today')
    ).toHaveTextContent('Partial floor');
  });

  it('renders Unable to calculate for a null estimate and No recorded calls for zero tokens', () => {
    setCost({
      data: costResponse({
        today: period('today', {
          totalTokens: 5,
          totalEstimatedCost: null,
          groups: [
            group('detection', { estimatedCost: null, totalTokens: 5, priceableTokens: 0 }),
            group('investigation', { estimatedCost: 0, totalTokens: 0 }),
            group('ki_extraction', { estimatedCost: 0, totalTokens: 0 }),
            group('memory', { estimatedCost: 0, totalTokens: 0 }),
          ],
        }),
        month: period('this_month', {
          totalTokens: 0,
          totalEstimatedCost: 0,
          groups: [
            group('detection', { estimatedCost: 0, totalTokens: 0 }),
            group('investigation', { estimatedCost: 0, totalTokens: 0 }),
            group('ki_extraction', { estimatedCost: 0, totalTokens: 0 }),
            group('memory', { estimatedCost: 0, totalTokens: 0 }),
          ],
        }),
      }),
    });
    renderCost();
    expect(screen.getByTestId('significantEventsCostHeadline')).toHaveTextContent(
      'Unable to calculate today · No recorded calls this month (recorded calls)'
    );
    expect(screen.getByTestId('significantEventsCostGroupToday-detection')).toHaveTextContent(
      'Unable to calculate'
    );
    expect(screen.getByTestId('significantEventsCostGroupMonth-detection')).toHaveTextContent(
      'No recorded calls'
    );
  });

  it('shows network, pricing, and usage-data errors with Retry', () => {
    setCost({ data: undefined, error: new Error('network down') });
    const { unmount } = renderCost();
    expect(screen.getByText('Cost estimate unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('significantEventsCostRetryButton'));
    expect(retryCost).toHaveBeenCalled();
    unmount();

    setCost({
      data: costResponse({ unavailableReason: 'pricing' }),
      error: null,
    });
    const pricing = renderCost();
    expect(screen.getByText('Unable to fetch pricing data')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('significantEventsCostRetryButton'));
    expect(retryCost).toHaveBeenCalledTimes(2);
    pricing.unmount();

    setCost({
      data: costResponse({ unavailableReason: 'usage_data' }),
      error: null,
    });
    renderCost();
    expect(screen.getByText('Unable to read token usage data')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('significantEventsCostRetryButton'));
    expect(retryCost).toHaveBeenCalledTimes(3);
  });

  it('wires refresh to refreshCost and shows the loading state', () => {
    setCost({ isRefreshing: true });
    renderCost();
    const button = screen.getByTestId('significantEventsCostRefreshButton');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    setCost({ isRefreshing: false });
  });

  it('calls refreshCost from the refresh button', () => {
    renderCost();
    fireEvent.click(screen.getByTestId('significantEventsCostRefreshButton'));
    expect(refreshCost).toHaveBeenCalled();
  });

  it('translates caveats, stale prices, and singular and plural tier crossings', () => {
    setCost({
      data: costResponse({
        pricesStale: true,
        caveats: [...ALWAYS_CAVEATS, 'prices_stale', 'tier_crossings_detected'],
        month: period('this_month', {
          groups: [
            group('detection', { tierCrossingCount: 1 }),
            group('investigation', { tierCrossingCount: 0 }),
            group('ki_extraction', { tierCrossingCount: 0 }),
            group('memory', { tierCrossingCount: 0 }),
          ],
        }),
      }),
    });
    const { rerender } = renderCost();
    const caveats = screen.getByTestId('significantEventsCostCaveats');
    expect(caveats).toHaveTextContent('Prices are based on Elastic Inference Service list rates.');
    expect(caveats).toHaveTextContent(
      'Pricing is treated as USD because the catalog does not identify a currency.'
    );
    expect(caveats).toHaveTextContent('Embedding and rerank inference is excluded.');
    expect(caveats).toHaveTextContent(
      'Calls that fail before token usage is recorded are excluded.'
    );
    expect(caveats).toHaveTextContent(
      'Cache-write tokens are excluded because Kibana does not record them.'
    );
    expect(caveats).toHaveTextContent(
      'Based on recorded calls in spaces where token usage tracking is enabled. Not all spaces may be tracked.'
    );
    expect(caveats).toHaveTextContent(
      'Price data is outdated; estimates may not reflect current rates.'
    );
    expect(caveats).toHaveTextContent(
      'Estimate uses lower-tier pricing; 1 call exceeded the tier threshold.'
    );

    setCost({
      data: costResponse({
        caveats: [...ALWAYS_CAVEATS, 'tier_crossings_detected'],
        month: period('this_month', {
          groups: [
            group('detection', { tierCrossingCount: 2 }),
            group('investigation', { tierCrossingCount: 3 }),
            group('ki_extraction', { tierCrossingCount: 0 }),
            group('memory', { tierCrossingCount: 0 }),
          ],
        }),
      }),
    });
    rerender(
      <I18nProvider>
        <CostEstimate />
      </I18nProvider>
    );
    expect(screen.getByTestId('significantEventsCostCaveats')).toHaveTextContent(
      'Estimate uses lower-tier pricing; 5 calls exceeded the tier threshold.'
    );
  });

  it('renders asOf in local time', () => {
    renderCost();
    const expected = new Date('2026-09-09T15:04:00.000Z').toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(screen.getByTestId('significantEventsCostAsOf')).toHaveTextContent(expected);
    expect(screen.getByTestId('significantEventsCostAsOf')).toHaveTextContent(
      'at current list prices'
    );
  });
});
