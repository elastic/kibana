/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  CostFigureResponse,
  GroupWorkflowAttributionResponse,
  RunBudgetGroupId,
  SignificantEventsCostResponse,
} from '@kbn/significant-events-plugin/common';
import {
  useSetSignificantEventsTokenTracking,
  useSignificantEventsCost,
} from '../../../../hooks/use_significant_events_cost';
import { CostEstimate, formatApproximateCost } from './cost_estimate';

jest.mock('../../../../hooks/use_significant_events_cost');

const mockUseCost = useSignificantEventsCost as jest.MockedFunction<
  typeof useSignificantEventsCost
>;
const mockUseSetTracking = useSetSignificantEventsTokenTracking as jest.MockedFunction<
  typeof useSetSignificantEventsTokenTracking
>;

const groupLabels = {
  detection: 'Detection',
  investigation: 'Investigation',
  ki_extraction: 'Knowledge extraction',
  memory: 'Memory upkeep',
};

const figure = (overrides: Partial<CostFigureResponse> = {}): CostFigureResponse => ({
  estimatedCost: 0.21,
  coverage: 'complete',
  tokens: { prompt: 100, cached: 0, completion: 50, thinking: 0 },
  pricedTokenCount: 150,
  unpricedTokenCount: 0,
  nonEisTokenCount: 0,
  unpricedConnectorIds: [],
  nonEisConnectorIds: [],
  byoConnectorIds: [],
  selfHostedConnectorIds: [],
  missingModelIds: [],
  truncated: false,
  ...overrides,
});

const response = ({
  currentSpaceTracking = 'enabled',
  monthLabel = 'month_to_date',
  allSpacesTracked = true,
  totalSpaceCount = 2,
  coveredSpaceCount = 2,
  todayFigure = figure(),
  monthFigure = figure({ estimatedCost: 1.23 }),
}: {
  currentSpaceTracking?: 'enabled' | 'disabled' | 'unknown';
  monthLabel?: 'month_to_date' | 'unverified_period';
  allSpacesTracked?: boolean;
  totalSpaceCount?: number;
  coveredSpaceCount?: number;
  todayFigure?: CostFigureResponse;
  monthFigure?: CostFigureResponse;
} = {}): SignificantEventsCostResponse => {
  const attribution = (group: RunBudgetGroupId): GroupWorkflowAttributionResponse => ({
    group,
    status: group === 'ki_extraction' ? 'not_attributable' : 'attributed',
    tokens: todayFigure.tokens,
    estimatedCost: todayFigure.estimatedCost,
    coverage: todayFigure.coverage,
    workflows: [],
    unpricedConnectorIds: [],
    reconciliationRatio: 1,
    inconsistent: false,
    otherPathsTokens: 0,
    otherPathsEstimatedCost: 0,
  });
  const attributionGroups = {
    detection: attribution('detection'),
    investigation: attribution('investigation'),
    ki_extraction: attribution('ki_extraction'),
    memory: attribution('memory'),
  };
  const tokenGroups = {
    detection: todayFigure,
    investigation: todayFigure,
    ki_extraction: todayFigure,
    memory: todayFigure,
  };
  const currency = {
    unit: '1M Token' as const,
    code: 'USD' as const,
    symbol: '$' as const,
    assumed: false,
  };
  const knownGaps = [
    'mid_stream_failures_unrecorded',
    'non_chat_inference_excluded',
    'token_index_write_failures_unrecorded',
    'cache_write_tokens_unavailable',
  ] as const;

  return {
    asOf: '2026-08-31T12:00:00.000Z',
    spaceCoverage: {
      totalSpaceCount,
      coveredSpaceCount,
      allSpacesTracked,
      currentSpaceTracking,
      spaces: [
        { id: 'default', name: 'Default', tracking: 'enabled' },
        {
          id: 'space-a',
          name: 'Space A',
          tracking: allSpacesTracked ? 'enabled' : 'disabled',
        },
      ],
      untrackedSpaces: allSpacesTracked ? [] : [{ id: 'space-a', name: 'Space A' }],
      unavailableSpaceCount: 0,
      newSpaces: [],
      fullTrackingSince: '2026-08-01T00:00:00.000Z',
    },
    today: {
      tokenIndex: {
        source: 'token_index',
        period: {
          kind: 'today',
          start: '2026-08-31T00:00:00.000Z',
          end: '2026-09-01T00:00:00.000Z',
          label: 'today',
          fullCoverage: true,
        },
        total: todayFigure,
        groups: tokenGroups,
        unknownFeatureDocumentCount: 0,
        tierCrossings: [],
        priceStale: false,
        serviceMapStale: false,
        priceFetchedAt: '2026-08-31T12:00:00.000Z',
        currency,
        knownGaps: [...knownGaps],
      },
      workflowAttribution: {
        source: 'workflow_step_usage',
        groups: attributionGroups,
        trackingGaps: [],
      },
    },
    month: {
      tokenIndex: {
        source: 'token_index',
        period: {
          kind: 'month',
          start: '2026-08-01T00:00:00.000Z',
          end: '2026-09-01T00:00:00.000Z',
          label: monthLabel,
          fullCoverage: monthLabel === 'month_to_date',
        },
        total: monthFigure,
        groups: tokenGroups,
        unknownFeatureDocumentCount: 0,
        tierCrossings: [],
        priceStale: false,
        serviceMapStale: false,
        priceFetchedAt: '2026-08-31T12:00:00.000Z',
        currency,
        knownGaps: [...knownGaps],
      },
      workflowAttribution: {
        source: 'workflow_step_usage',
        groups: attributionGroups,
        trackingGaps: [],
      },
    },
    interactiveAgentChatsExcluded: true,
  };
};

const setup = (data: SignificantEventsCostResponse) => {
  mockUseCost.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useSignificantEventsCost>);
  mockUseSetTracking.mockReturnValue({
    setTracking: jest.fn().mockResolvedValue(undefined),
    isUpdating: false,
  });
  render(
    <I18nProvider>
      <CostEstimate canManage groupLabels={groupLabels} />
    </I18nProvider>
  );
};

describe('CostEstimate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('never formats an incomplete zero as a zero-dollar claim', () => {
    expect(
      formatApproximateCost({
        figure: figure({
          estimatedCost: 0,
          coverage: 'partial',
          pricedTokenCount: 0,
          unpricedTokenCount: 150,
        }),
        currency: {
          unit: '1M Token',
          code: 'USD',
          symbol: '$',
          assumed: false,
        },
      })
    ).toBeUndefined();
  });

  it('does not use a currency symbol when the source currency is unconfirmed', () => {
    expect(
      formatApproximateCost({
        figure: figure(),
        currency: {
          unit: '1M Token',
          code: null,
          symbol: null,
          assumed: true,
        },
      })
    ).toBe('~0.21 units per 1M Token');
  });

  it('withholds cost when tracking is disabled in the current space', () => {
    setup(response({ currentSpaceTracking: 'disabled' }));

    expect(
      screen.getByText(
        'Token usage tracking is off in this space, so estimated costs are not shown.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId('significantEventsCostHeadline')).not.toBeInTheDocument();
  });

  it('does not render cached deployment data without the global privilege', () => {
    const data = response();
    mockUseCost.mockReturnValue({
      data,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useSignificantEventsCost>);
    mockUseSetTracking.mockReturnValue({
      setTracking: jest.fn().mockResolvedValue(undefined),
      isUpdating: false,
    });

    render(
      <I18nProvider>
        <CostEstimate canManage={false} groupLabels={groupLabels} />
      </I18nProvider>
    );

    expect(screen.queryByTestId('significantEventsCostHeadline')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Deployment-wide cost is available to users who can manage Streams in all spaces.'
      )
    ).toBeInTheDocument();
  });

  it('does not show a calendar-month label without the audit watermark', () => {
    setup(
      response({
        monthLabel: 'unverified_period',
        monthFigure: figure({
          estimatedCost: 0,
          coverage: 'partial',
          pricedTokenCount: 0,
          unpricedTokenCount: 150,
        }),
      })
    );

    expect(screen.getByTestId('significantEventsCostHeadline')).toHaveTextContent('~$0.21 today');
    expect(screen.queryByText(/this month/i)).not.toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'A calendar-month figure will appear after tracking has been audited for the full period.'
      )
    ).toBeInTheDocument();
  });

  it('discloses partial space coverage and other-provider usage', () => {
    setup(
      response({
        allSpacesTracked: false,
        coveredSpaceCount: 1,
        todayFigure: figure({
          coverage: 'partial',
          nonEisTokenCount: 30,
          unpricedTokenCount: 30,
        }),
      })
    );

    expect(screen.getByText(/Based on 1 of 2 spaces/)).toBeInTheDocument();
    expect(
      screen.getByText('20% of recorded tokens used third-party providers, which cannot be priced.')
    ).toBeInTheDocument();
  });

  it('names newly discovered spaces without tracking and offers the global action', () => {
    const data = response({
      allSpacesTracked: false,
      coveredSpaceCount: 1,
    });
    data.spaceCoverage.newSpaces = [{ id: 'space-a', name: 'Space A' }];

    setup(data);

    expect(screen.getByText('New space without token tracking: Space A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable for all spaces' })).toBeInTheDocument();
  });

  it('keeps workflow attribution separate and makes reconciliation visible', () => {
    const data = response();
    data.today.workflowAttribution.groups.detection = {
      ...data.today.workflowAttribution.groups.detection,
      tokens: { prompt: 90, cached: 0, completion: 45, thinking: 0 },
      estimatedCost: 0.18,
      reconciliationRatio: 0.9,
      otherPathsTokens: 15,
      otherPathsEstimatedCost: 0.03,
      workflows: [
        {
          workflowId: 'significant-events-discovery',
          tokens: { prompt: 90, cached: 0, completion: 45, thinking: 0 },
          estimatedCost: 0.18,
          coverage: 'complete',
          steps: [
            {
              stepId: 'discover',
              connectorId: 'connector-a',
              tokens: {
                prompt: 90,
                cached: 0,
                completion: 45,
                thinking: 0,
              },
              estimatedCost: 0.18,
              coverage: 'complete',
            },
          ],
        },
      ],
    };

    setup(data);

    expect(
      screen.getByText(
        'This attribution is not added to the recorded-call total. It covers 90% of recorded-call tokens in this group.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Other recorded paths')).toBeInTheDocument();
    expect(screen.getByText('Step discover using connector-a')).toBeInTheDocument();
  });

  it('labels partial headlines and surfaces taxonomy and tier warnings', () => {
    const data = response({
      todayFigure: figure({ coverage: 'partial' }),
    });
    data.today.tokenIndex.unknownFeatureDocumentCount = 2;
    data.today.tokenIndex.tierCrossings = [
      {
        modelId: 'openai-gpt-5.4',
        threshold: 272000,
        documentCount: 3,
      },
    ];

    setup(data);

    expect(screen.getByTestId('significantEventsCostHeadline')).toHaveTextContent('Partial floor');
    expect(screen.getByText(/2 recorded calls have an unknown cost category/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Lower-tier prices were used for calls above a prompt threshold: openai-gpt-5.4 (3).'
      )
    ).toBeInTheDocument();
  });

  it('names the detected tracking-gap ranges', () => {
    const data = response();
    data.month.workflowAttribution.trackingGaps = [
      {
        start: '2026-08-10T06:00:00.000Z',
        end: '2026-08-10T18:00:00.000Z',
        source: 'audit',
      },
    ];

    setup(data);

    expect(
      screen.getByText(
        /Cost approximation is incomplete: token tracking was off on .* to .* while workflows ran/
      )
    ).toBeInTheDocument();
  });

  it('requires confirmation before stopping deployment-wide tracking', () => {
    setup(response());

    fireEvent.click(screen.getByTestId('significantEventsAllSpacesTrackingSwitch'));

    expect(
      screen.getByRole('alertdialog', {
        name: 'Stop token tracking in all spaces?',
      })
    ).toHaveTextContent('Elastic Inference Service spend will continue without being recorded');
  });
});
