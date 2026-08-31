/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useRunQuotas, useRunQuotaStatus } from '../../../hooks/use_significant_events_run_quotas';
import { RunLimitsBanner } from './run_limits_banner';

jest.mock('../../../hooks/use_significant_events_run_quotas');
jest.mock('../../../hooks/use_significant_events_app_router', () => ({
  useSignificantEventsAppRouter: () => ({ link: jest.fn().mockReturnValue('#settings') }),
}));

const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;
const mockUseRunQuotaStatus = useRunQuotaStatus as jest.MockedFunction<typeof useRunQuotaStatus>;

describe('RunLimitsBanner', () => {
  it('stays absent while enforcement is off', () => {
    mockUseRunQuotaStatus.mockReturnValue({
      data: { enabled: false },
    } as unknown as ReturnType<typeof useRunQuotaStatus>);
    mockUseRunQuotas.mockReturnValue({
      data: { groups: [] },
    } as unknown as ReturnType<typeof useRunQuotas>);

    render(
      <I18nProvider>
        <RunLimitsBanner />
      </I18nProvider>
    );

    expect(screen.queryByTestId('significantEventsRunLimitsBanner')).not.toBeInTheDocument();
  });

  it('uses report numbers, explains manual runs, and offers management to authorized callers', () => {
    mockUseRunQuotaStatus.mockReturnValue({
      data: { enabled: true, canManageLimits: true },
    } as unknown as ReturnType<typeof useRunQuotaStatus>);
    mockUseRunQuotas.mockReturnValue({
      data: {
        groups: [
          {
            group: 'detection',
            limit: { enabled: true, max: 100 },
            counted: 100,
            totalSkipped: 0,
          },
        ],
      },
    } as unknown as ReturnType<typeof useRunQuotas>);

    render(
      <I18nProvider>
        <RunLimitsBanner />
      </I18nProvider>
    );

    expect(screen.getByTestId('significantEventsRunLimitsBanner')).toHaveTextContent(
      'Discovery (100 counted of 100)'
    );
    expect(screen.getByTestId('significantEventsRunLimitsBanner')).toHaveTextContent(
      'Run limits do not apply to manual runs'
    );
    expect(screen.getByText('Review run limits')).toBeInTheDocument();
  });

  it('stays absent after a raised limit reopens admission despite earlier denials', () => {
    mockUseRunQuotaStatus.mockReturnValue({
      data: { enabled: true, canManageLimits: true },
    } as unknown as ReturnType<typeof useRunQuotaStatus>);
    mockUseRunQuotas.mockReturnValue({
      data: {
        groups: [
          {
            group: 'investigation',
            limit: { enabled: true, max: 60 },
            counted: 31,
            totalSkipped: 23,
          },
        ],
      },
    } as unknown as ReturnType<typeof useRunQuotas>);

    render(
      <I18nProvider>
        <RunLimitsBanner />
      </I18nProvider>
    );

    expect(screen.queryByTestId('significantEventsRunLimitsBanner')).not.toBeInTheDocument();
  });
});
