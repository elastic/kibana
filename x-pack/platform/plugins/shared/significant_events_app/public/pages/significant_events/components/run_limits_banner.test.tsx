/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RunQuotasResponse } from '@kbn/significant-events-plugin/common';
import { useRunQuotas } from '../../../hooks/use_significant_events_run_quotas';
import { RunLimitsBanner } from './run_limits_banner';

jest.mock('../../../hooks/use_significant_events_run_quotas');
jest.mock('../../../hooks/use_significant_events_app_router', () => ({
  useSignificantEventsAppRouter: () => ({ link: jest.fn().mockReturnValue('#settings') }),
}));

const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;

const response = (overrides: Partial<RunQuotasResponse> = {}): RunQuotasResponse => ({
  enabled: true,
  limits: {
    detection: 100,
    investigation: 30,
    ki_extraction: 0,
  },
  counts: {
    detection: 100,
    investigation: 5,
    ki_extraction: 500,
  },
  window: {
    start: '2026-09-03T00:00:00.000Z',
    resetsAt: '2026-09-04T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage: true,
  ...overrides,
});

const setResponse = (data: RunQuotasResponse) => {
  mockUseRunQuotas.mockReturnValue({
    data,
  } as ReturnType<typeof useRunQuotas>);
};

describe('RunLimitsBanner', () => {
  it('shows only finite reached limits while enforcement is enabled', () => {
    setResponse(response());

    render(
      <I18nProvider>
        <RunLimitsBanner />
      </I18nProvider>
    );

    expect(screen.getByTestId('significantEventsRunLimitsBanner')).toHaveTextContent(
      'Discovery: 100 counted scheduled admissions, daily limit 100'
    );
    expect(screen.getByTestId('significantEventsRunLimitsBanner')).not.toHaveTextContent(
      'Knowledge indicator extraction'
    );
    expect(screen.getByTestId('significantEventsRunLimitsBanner')).toHaveTextContent(
      'Critical scheduled investigations continue'
    );
  });

  it('clears when the limit is raised or enforcement is disabled', () => {
    setResponse(response());
    const { rerender } = render(
      <I18nProvider>
        <RunLimitsBanner />
      </I18nProvider>
    );
    expect(screen.getByTestId('significantEventsRunLimitsBanner')).toBeInTheDocument();

    setResponse(
      response({
        limits: { detection: 101, investigation: 30, ki_extraction: 0 },
      })
    );
    rerender(
      <I18nProvider>
        <RunLimitsBanner />
      </I18nProvider>
    );
    expect(screen.queryByTestId('significantEventsRunLimitsBanner')).not.toBeInTheDocument();

    setResponse(response({ enabled: false }));
    rerender(
      <I18nProvider>
        <RunLimitsBanner />
      </I18nProvider>
    );
    expect(screen.queryByTestId('significantEventsRunLimitsBanner')).not.toBeInTheDocument();
  });
});
