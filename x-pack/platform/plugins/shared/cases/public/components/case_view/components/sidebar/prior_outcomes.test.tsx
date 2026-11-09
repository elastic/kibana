/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../../common/mock';
import { basicCase } from '../../../../containers/mock';
import { useCasesConfig } from '../../../../common/lib/kibana';
import { useGetPriorOutcomes } from '../../../../containers/use_get_prior_outcomes';
import { PriorOutcomes } from './prior_outcomes';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/navigation/hooks');
jest.mock('../../../../containers/use_get_prior_outcomes');

const useCasesConfigMock = useCasesConfig as jest.Mock;
const useGetPriorOutcomesMock = useGetPriorOutcomes as jest.Mock;

const outcomes = (closeReasons: Record<string, number>, total: number) => ({
  data: {
    available: true,
    days: 90,
    total,
    close_reasons: closeReasons,
    outcomes: [
      {
        case_id: 'case-1',
        title: 'Credential dumping on fin-ws-07',
        incremental_id: 1287,
        close_reason: 'false_positive',
        closed_at: '2026-11-01T10:00:00.000Z',
      },
    ],
  },
  isLoading: false,
  isError: false,
});

describe('PriorOutcomes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCasesConfigMock.mockReturnValue({ knowledgeEnabled: true });
  });

  it('says how many similar cases closed and lists them on demand', async () => {
    useGetPriorOutcomesMock.mockReturnValue(outcomes({ false_positive: 1 }, 1));

    renderWithTestingProviders(<PriorOutcomes caseData={basicCase} />);

    expect(screen.getByTestId('case-view-prior-outcomes-toggle')).toHaveTextContent(
      '1 similar case closed as false positive'
    );
    expect(screen.queryByTestId('case-view-prior-outcomes-list')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('case-view-prior-outcomes-toggle'));
    expect(screen.getByTestId('case-view-prior-outcome-link')).toHaveTextContent(
      '#1287 Credential dumping on fin-ws-07'
    );
  });

  it('counts every match and says "most" when the reasons are mixed', () => {
    useGetPriorOutcomesMock.mockReturnValue(outcomes({ false_positive: 9, true_positive: 5 }, 14));

    renderWithTestingProviders(<PriorOutcomes caseData={basicCase} />);

    expect(screen.getByTestId('case-view-prior-outcomes-toggle')).toHaveTextContent(
      '14 similar closed cases, most as false positive'
    );
  });

  it('says so when nothing matches, and hides when unavailable or the flag is off', () => {
    useGetPriorOutcomesMock.mockReturnValue({
      data: { available: true, days: 90, total: 0, close_reasons: {}, outcomes: [] },
      isLoading: false,
      isError: false,
    });
    const { unmount } = renderWithTestingProviders(<PriorOutcomes caseData={basicCase} />);
    expect(screen.getByTestId('case-view-prior-outcomes-none')).toHaveTextContent(
      'No similar closed cases in the last 90 days'
    );
    unmount();

    useGetPriorOutcomesMock.mockReturnValue({
      data: { available: false },
      isLoading: false,
      isError: false,
    });
    const second = renderWithTestingProviders(<PriorOutcomes caseData={basicCase} />);
    expect(screen.queryByTestId('case-view-prior-outcomes')).not.toBeInTheDocument();
    second.unmount();

    useCasesConfigMock.mockReturnValue({ knowledgeEnabled: false });
    renderWithTestingProviders(<PriorOutcomes caseData={basicCase} />);
    expect(screen.queryByTestId('case-view-prior-outcomes')).not.toBeInTheDocument();
  });
});
