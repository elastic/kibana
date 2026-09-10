/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { BehaviorSubject, Subject } from 'rxjs';
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
import { useSignificantEventsCost } from '../../../../hooks/use_significant_events_cost';
import { useRunQuotas } from '../../../../hooks/use_significant_events_run_quotas';
import { CostEstimate } from './cost_estimate';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_significant_events_cost');
jest.mock('../../../../hooks/use_significant_events_run_quotas');
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const { useState } = jest.requireActual('react') as typeof import('react');
  const MockEuiIconTip = ({
    content,
    anchorProps,
    'aria-label': ariaLabel,
  }: {
    content: React.ReactNode;
    anchorProps?: { 'data-test-subj'?: string };
    'aria-label'?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <button
          type="button"
          aria-label={ariaLabel}
          data-test-subj={anchorProps?.['data-test-subj']}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
        />
        {isOpen ? <span role="tooltip">{content}</span> : null}
      </>
    );
  };
  const MockEuiToolTip = ({
    content,
    children,
  }: {
    content?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <span
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        {children}
        {isOpen && content ? <span role="tooltip">{content}</span> : null}
      </span>
    );
  };

  return {
    ...actual,
    EuiIconTip: MockEuiIconTip,
    EuiToolTip: MockEuiToolTip,
  };
});

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSignificantEventsCost = useSignificantEventsCost as jest.MockedFunction<
  typeof useSignificantEventsCost
>;
const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;

const refreshCost = jest.fn();
const retryCost = jest.fn();
const setUiSetting = jest.fn();
const installTokenUsageDashboard = jest.fn();
const addDanger = jest.fn();
const addWarning = jest.fn();

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
    group('discovery', { estimatedCost: 1.2, totalTokens: 12 }),
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
  trackingCoverage: {
    status: 'partial',
    enabledSpaceCount: 1,
    totalSpaceCount: 2,
  },
  ...overrides,
});

const setTracking = (enabled: boolean, canSaveAdvancedSettings = true) => {
  const tracking$ = new BehaviorSubject(enabled);
  const updateErrors$ = new Subject<Error>();
  setUiSetting.mockImplementation(async (key: string, value: boolean) => {
    if (key === GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING) {
      tracking$.next(value);
    }
    return true;
  });
  installTokenUsageDashboard.mockResolvedValue({ installed: true });
  mockUseKibana.mockReturnValue({
    core: {
      application: {
        capabilities: {
          advancedSettings: {
            save: canSaveAdvancedSettings,
          },
        },
      },
      settings: {
        client: {
          get: jest.fn().mockReturnValue(enabled),
          get$: jest.fn().mockReturnValue(tracking$),
          getUpdateErrors$: jest.fn().mockReturnValue(updateErrors$),
          set: setUiSetting,
        },
      },
      http: {
        post: installTokenUsageDashboard,
      },
      notifications: {
        toasts: {
          addDanger,
          addWarning,
        },
      },
    },
  } as never);
  return { tracking$, updateErrors$ };
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

const renderExpandedCost = () => {
  const result = renderCost();
  fireEvent.click(screen.getByTestId('significantEventsCostAccordionButton'));
  return result;
};

describe('CostEstimate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshCost.mockReset().mockResolvedValue(undefined);
    retryCost.mockReset().mockResolvedValue(undefined);
    setUiSetting.mockReset();
    installTokenUsageDashboard.mockReset();
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

  it('is hidden and disables cost fetching when stale privilege data has an error', () => {
    mockUseRunQuotas.mockReturnValue({
      data: quotasResponse(true),
      isLoading: false,
      isError: true,
    } as never);
    renderCost();
    expect(screen.queryByTestId('significantEventsCostSection')).not.toBeInTheDocument();
  });

  it('keeps cost details hidden until the accordion is opened', () => {
    renderCost();
    const accordionButton = screen.getByTestId('significantEventsCostAccordionButton');
    const headline = screen.getByTestId('significantEventsCostHeadline');
    expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
    expect(headline).not.toBeVisible();
    fireEvent.click(accordionButton);
    expect(accordionButton).toHaveAttribute('aria-expanded', 'true');
    expect(headline).toBeVisible();
  });

  it('shows deployment-wide partial costs and an enable action when this space is disabled', async () => {
    setTracking(false);
    refreshCost.mockImplementationOnce(async () => {
      setCost({
        data: costResponse({
          caveats: ALWAYS_CAVEATS.filter((caveat) => caveat !== 'tracking_not_all_spaces'),
          trackingCoverage: {
            status: 'full',
            enabledSpaceCount: 2,
            totalSpaceCount: 2,
          },
        }),
      });
    });
    renderExpandedCost();
    expect(screen.getByTestId('significantEventsTokenTrackingCoverage')).toHaveTextContent(
      '1 of 2 spaces tracked'
    );
    expect(screen.getByTestId('significantEventsCostHeadline')).toBeInTheDocument();
    const enableButton = screen.getByTestId('significantEventsEnableTokenTrackingButton');
    expect(enableButton).toHaveTextContent('Enable token tracking in this space');
    expect(mockUseSignificantEventsCost).toHaveBeenCalledWith({ enabled: true });

    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(setUiSetting).toHaveBeenCalledWith(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, true);
      expect(installTokenUsageDashboard).toHaveBeenCalledWith(
        '/internal/gen_ai_settings/install_token_usage_dashboard'
      );
      expect(refreshCost).toHaveBeenCalled();
      expect(screen.getByTestId('significantEventsTokenTrackingCoverage')).toHaveTextContent(
        '2 of 2 spaces tracked'
      );
    });
    expect(
      screen.queryByTestId('significantEventsEnableTokenTrackingButton')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('significantEventsTrackingCoverageCallout')
    ).not.toBeInTheDocument();
  });

  it('disables the enable button without Advanced Settings save permission', () => {
    setTracking(false, false);
    renderExpandedCost();
    const enableButton = screen.getByTestId('significantEventsEnableTokenTrackingButton');
    expect(enableButton).toBeDisabled();
    const tooltipAnchor = screen.getByTestId('significantEventsEnableTokenTrackingTooltipAnchor');
    expect(tooltipAnchor).toHaveAttribute('tabindex', '0');
    fireEvent.focus(tooltipAnchor);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'You need permission to save Advanced Settings before you can enable token tracking.'
    );
  });

  it('surfaces the setting update error and keeps the enable action available', async () => {
    const { updateErrors$ } = setTracking(false);
    setUiSetting.mockImplementation(async () => {
      updateErrors$.next(new Error('save rejected'));
      return false;
    });
    renderExpandedCost();
    fireEvent.click(screen.getByTestId('significantEventsEnableTokenTrackingButton'));

    await waitFor(() => {
      expect(addDanger).toHaveBeenCalledWith({
        title: 'Unable to enable token tracking',
        text: 'save rejected',
      });
      expect(screen.getByTestId('significantEventsEnableTokenTrackingButton')).toBeEnabled();
    });
    expect(installTokenUsageDashboard).not.toHaveBeenCalled();
    expect(refreshCost).not.toHaveBeenCalled();
  });

  it('keeps tracking enabled when dashboard installation fails', async () => {
    setTracking(false);
    installTokenUsageDashboard.mockRejectedValue(new Error('dashboard unavailable'));
    renderExpandedCost();
    fireEvent.click(screen.getByTestId('significantEventsEnableTokenTrackingButton'));

    await waitFor(() => {
      expect(addWarning).toHaveBeenCalledWith({
        title: 'Token tracking was enabled, but the token usage dashboard could not be installed',
        text: 'dashboard unavailable',
      });
      expect(refreshCost).toHaveBeenCalled();
      expect(
        screen.queryByTestId('significantEventsEnableTokenTrackingButton')
      ).not.toBeInTheDocument();
    });
    expect(addDanger).not.toHaveBeenCalled();
  });

  it('shows cross-space token tracking coverage', () => {
    renderExpandedCost();
    expect(screen.getByTestId('significantEventsTokenTrackingCoverage')).toHaveTextContent(
      '1 of 2 spaces tracked'
    );
    expect(screen.getByTestId('significantEventsTrackingCoverageCallout')).toHaveTextContent(
      'Token tracking is enabled in 1 of 2 spaces'
    );
    expect(screen.getByTestId('significantEventsTrackingCoverageCallout')).toHaveTextContent(
      'This deployment-wide estimate includes all Significant Events calls recorded during the selected period.'
    );
    expect(mockUseKibana().core.settings.client.get).toHaveBeenCalledWith(
      GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING,
      false
    );
  });

  it('shows full coverage without a coverage callout', () => {
    setCost({
      data: costResponse({
        caveats: ALWAYS_CAVEATS.filter((caveat) => caveat !== 'tracking_not_all_spaces'),
        trackingCoverage: {
          status: 'full',
          enabledSpaceCount: 2,
          totalSpaceCount: 2,
        },
      }),
    });
    renderExpandedCost();
    expect(screen.getByTestId('significantEventsTokenTrackingCoverage')).toHaveTextContent(
      '2 of 2 spaces tracked'
    );
    expect(
      screen.queryByTestId('significantEventsTrackingCoverageCallout')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('significantEventsCostHeadline')).toBeInTheDocument();
  });

  it('reveals global costs after enabling tracking from zero coverage', async () => {
    setTracking(false);
    setCost({
      data: costResponse({
        trackingCoverage: {
          status: 'none',
          enabledSpaceCount: 0,
          totalSpaceCount: 2,
        },
      }),
    });
    refreshCost.mockImplementationOnce(async () => {
      setCost({
        data: costResponse({
          trackingCoverage: {
            status: 'partial',
            enabledSpaceCount: 1,
            totalSpaceCount: 2,
          },
        }),
      });
    });
    renderExpandedCost();
    expect(screen.getByTestId('significantEventsTokenTrackingCoverage')).toHaveTextContent(
      '0 of 2 spaces tracked'
    );
    expect(screen.getByTestId('significantEventsEnableTokenTrackingButton')).toBeInTheDocument();
    expect(screen.queryByTestId('significantEventsCostHeadline')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('significantEventsEnableTokenTrackingButton'));
    await waitFor(() => {
      expect(screen.getByTestId('significantEventsTokenTrackingCoverage')).toHaveTextContent(
        '1 of 2 spaces tracked'
      );
      expect(screen.getByTestId('significantEventsCostHeadline')).toBeVisible();
    });
    expect(
      screen.queryByTestId('significantEventsEnableTokenTrackingButton')
    ).not.toBeInTheDocument();
  });

  it('shows recorded global costs when coverage cannot be determined', () => {
    setCost({
      data: costResponse({
        trackingCoverage: {
          status: 'unavailable',
          enabledSpaceCount: null,
          totalSpaceCount: null,
        },
      }),
    });
    renderExpandedCost();
    expect(screen.getByTestId('significantEventsTokenTrackingCoverage')).toHaveTextContent(
      'Tracking coverage unavailable'
    );
    expect(screen.getByTestId('significantEventsTrackingCoverageCallout')).toHaveTextContent(
      'Unable to determine token tracking coverage'
    );
    expect(screen.getByTestId('significantEventsCostHeadline')).toBeInTheDocument();
  });

  it('shows a loading spinner on the initial query', () => {
    setCost({ data: undefined, isLoading: true });
    renderExpandedCost();
    expect(screen.getByTestId('significantEventsCostLoading')).toBeVisible();
  });

  it('renders the headline, both group columns, fixed order, and numeric formatting', () => {
    renderExpandedCost();
    expect(screen.getByTestId('significantEventsCostHeadline')).toHaveTextContent(
      '~$11.40 today · ~$20.50 this month (recorded calls)'
    );
    const groups = screen.getAllByTestId(/^significantEventsCostGroup-/);
    expect(groups.map((node) => node.getAttribute('data-test-subj'))).toEqual([
      'significantEventsCostGroup-discovery',
      'significantEventsCostGroup-investigation',
      'significantEventsCostGroup-ki_extraction',
      'significantEventsCostGroup-memory',
    ]);
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Investigation')).toBeInTheDocument();
    expect(screen.getByText('KI extraction')).toBeInTheDocument();
    expect(screen.getByText('Memory')).toBeInTheDocument();
    expect(screen.getByTestId('significantEventsCostGroupToday-discovery')).toHaveTextContent(
      '~$1.20'
    );
    expect(screen.getByTestId('significantEventsCostGroupMonth-memory')).toHaveTextContent(
      '~$4.50'
    );
  });

  it('shows positive sub-cent costs instead of rounding them to zero', () => {
    setCost({
      data: costResponse({
        today: period('today', {
          groups: [
            group('discovery', {
              estimatedCost: 0.003,
              totalTokens: 1,
              priceableTokens: 1,
            }),
            group('investigation', {
              estimatedCost: 0,
              totalTokens: 0,
              priceableTokens: 0,
            }),
            group('ki_extraction', {
              estimatedCost: 0,
              totalTokens: 0,
              priceableTokens: 0,
            }),
            group('memory', {
              estimatedCost: 0,
              totalTokens: 0,
              priceableTokens: 0,
            }),
          ],
          totalEstimatedCost: 0.003,
          totalTokens: 1,
        }),
      }),
    });
    renderExpandedCost();

    expect(screen.getByTestId('significantEventsCostHeadline')).toHaveTextContent('<$0.01 today');
    expect(screen.getByTestId('significantEventsCostGroupToday-discovery')).toHaveTextContent(
      '<$0.01'
    );
  });

  it('keeps a partial numeric floor visible', () => {
    setCost({
      data: costResponse({
        today: period('today', {
          groups: [
            group('discovery', {
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
    renderExpandedCost();
    expect(screen.getByTestId('significantEventsCostGroupToday-discovery')).toHaveTextContent(
      '~$1.20'
    );
    expect(
      screen.getByTestId('significantEventsCostPartialBadge-discovery-today')
    ).toHaveTextContent('Partial floor');
  });

  it('marks the combined estimate as partial when unknown feature usage is omitted', () => {
    setCost({
      data: costResponse({
        today: period('today', {
          totalStatus: 'partial',
          unknownFeatureTokens: 25,
          unknownFeatureDocCount: 1,
        }),
      }),
    });
    renderExpandedCost();
    expect(screen.getByTestId('significantEventsCostTotalPartialBadge')).toHaveTextContent(
      'Partial floor'
    );
    expect(
      screen.queryByTestId('significantEventsCostPartialBadge-discovery-today')
    ).not.toBeInTheDocument();
  });

  it('renders Unable to calculate for a null estimate and No recorded calls for zero tokens', () => {
    setCost({
      data: costResponse({
        today: period('today', {
          totalTokens: 5,
          totalEstimatedCost: null,
          totalStatus: 'partial',
          groups: [
            group('discovery', { estimatedCost: null, totalTokens: 5, priceableTokens: 0 }),
            group('investigation', { estimatedCost: 0, totalTokens: 0 }),
            group('ki_extraction', { estimatedCost: 0, totalTokens: 0 }),
            group('memory', { estimatedCost: 0, totalTokens: 0 }),
          ],
        }),
        month: period('this_month', {
          totalTokens: 0,
          totalEstimatedCost: 0,
          groups: [
            group('discovery', { estimatedCost: 0, totalTokens: 0 }),
            group('investigation', { estimatedCost: 0, totalTokens: 0 }),
            group('ki_extraction', { estimatedCost: 0, totalTokens: 0 }),
            group('memory', { estimatedCost: 0, totalTokens: 0 }),
          ],
        }),
      }),
    });
    renderExpandedCost();
    expect(screen.getByTestId('significantEventsCostHeadline')).toHaveTextContent(
      'Unable to calculate today · No recorded calls this month (recorded calls)'
    );
    expect(screen.queryByTestId('significantEventsCostTotalPartialBadge')).not.toBeInTheDocument();
  });

  it('shows network, pricing, and usage-data errors with Retry', async () => {
    setCost({ data: undefined, error: new Error('network down') });
    retryCost.mockImplementationOnce(async () => {
      setCost();
    });
    const { unmount, rerender } = renderExpandedCost();
    expect(screen.getByText('Cost estimate unavailable')).toBeInTheDocument();
    expect(screen.getByText('network down')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('significantEventsCostRetryButton'));
    await waitFor(() => expect(retryCost).toHaveBeenCalled());
    rerender(
      <I18nProvider>
        <CostEstimate />
      </I18nProvider>
    );
    expect(screen.queryByText('Cost estimate unavailable')).not.toBeInTheDocument();
    expect(screen.getByTestId('significantEventsCostHeadline')).toBeVisible();
    unmount();

    setCost({
      data: costResponse({ unavailableReason: 'pricing' }),
      error: null,
    });
    const pricing = renderExpandedCost();
    expect(screen.getByText('Unable to fetch pricing data')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('significantEventsCostRetryButton'));
    expect(retryCost).toHaveBeenCalledTimes(2);
    pricing.unmount();

    setCost({
      data: costResponse({ unavailableReason: 'usage_data' }),
      error: null,
    });
    renderExpandedCost();
    expect(screen.getByText('Unable to read token usage data')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('significantEventsCostRetryButton'));
    expect(retryCost).toHaveBeenCalledTimes(3);
  });

  it('keeps the last estimate visible while retrying a failed refresh', async () => {
    setCost({ data: costResponse(), error: new Error('refresh failed') });
    refreshCost.mockImplementationOnce(async () => {
      setCost();
    });
    const { rerender } = renderExpandedCost();
    expect(screen.getByText('Unable to refresh cost estimate')).toBeInTheDocument();
    expect(screen.getByText('refresh failed')).toBeInTheDocument();
    expect(screen.getByTestId('significantEventsCostHeadline')).toBeVisible();

    fireEvent.click(screen.getByTestId('significantEventsCostRetryButton'));
    await waitFor(() => expect(refreshCost).toHaveBeenCalled());
    expect(retryCost).not.toHaveBeenCalled();
    rerender(
      <I18nProvider>
        <CostEstimate />
      </I18nProvider>
    );
    expect(screen.queryByText('Unable to refresh cost estimate')).not.toBeInTheDocument();
    expect(screen.getByTestId('significantEventsCostHeadline')).toBeVisible();
  });

  it('translates caveats, stale prices, and singular and plural tier crossings', () => {
    setCost({
      data: costResponse({
        pricesStale: true,
        caveats: [...ALWAYS_CAVEATS, 'prices_stale', 'tier_crossings_detected'],
        month: period('this_month', {
          groups: [
            group('discovery', { tierCrossingCount: 1 }),
            group('investigation', { tierCrossingCount: 0 }),
            group('ki_extraction', { tierCrossingCount: 0 }),
            group('memory', { tierCrossingCount: 0 }),
          ],
        }),
      }),
    });
    const { rerender } = renderExpandedCost();
    expect(screen.queryByTestId('significantEventsCostDetails')).not.toBeInTheDocument();
    fireEvent.focus(screen.getByTestId('significantEventsCostDetailsTooltip'));
    const caveats = screen.getByTestId('significantEventsCostDetails');
    expect(caveats).toHaveTextContent('Prices are based on Elastic Inference Service list rates.');
    expect(caveats).not.toHaveTextContent(
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
      'Token tracking is not enabled in every space. Calls made while tracking was disabled are not included.'
    );
    expect(caveats).toHaveTextContent(
      'Price data is outdated; estimates may not reflect current rates.'
    );
    expect(caveats).toHaveTextContent(
      'Estimate uses lower-tier pricing; 1 call exceeded the tier threshold.'
    );
    expect(screen.getByTestId('significantEventsCostPricingLink')).toHaveAttribute(
      'href',
      'https://cloud.elastic.co/cloud-pricing-table?productType=serverless&solution=elasticsearch'
    );

    setCost({
      data: costResponse({
        caveats: [...ALWAYS_CAVEATS, 'tier_crossings_detected'],
        month: period('this_month', {
          groups: [
            group('discovery', { tierCrossingCount: 2 }),
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
    expect(screen.getByTestId('significantEventsCostDetails')).toHaveTextContent(
      'Estimate uses lower-tier pricing; 5 calls exceeded the tier threshold.'
    );
  });
});
