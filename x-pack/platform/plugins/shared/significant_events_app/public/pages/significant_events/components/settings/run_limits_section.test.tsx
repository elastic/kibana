/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  RunQuotaSettingsUpdate,
  RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';
import {
  useRunQuotas,
  useUpdateRunQuotas,
} from '../../../../hooks/use_significant_events_run_quotas';
import { RunLimitsSection } from './run_limits_section';

jest.mock('../../../../hooks/use_significant_events_run_quotas');

const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;
const mockUseUpdateRunQuotas = useUpdateRunQuotas as jest.MockedFunction<typeof useUpdateRunQuotas>;

const save = jest.fn<Promise<RunQuotasResponse>, [RunQuotaSettingsUpdate]>();
const refetch = jest.fn();

const response = (overrides: Partial<RunQuotasResponse> = {}): RunQuotasResponse => ({
  enabled: true,
  limits: {
    detection: 100,
    investigation: 30,
    ki_extraction: 20,
  },
  counts: {
    detection: 4,
    investigation: 3,
    ki_extraction: 2,
  },
  window: {
    start: '2026-09-03T00:00:00.000Z',
    resetsAt: '2026-09-04T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage: true,
  ...overrides,
});

const setQueryResponse = (data: RunQuotasResponse) => {
  mockUseRunQuotas.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch,
  } as unknown as ReturnType<typeof useRunQuotas>);
};

const setup = (data: RunQuotasResponse = response()) => {
  setQueryResponse(data);
  mockUseUpdateRunQuotas.mockReturnValue({ save, isSaving: false });
  save.mockResolvedValue(data);

  return render(
    <I18nProvider>
      <RunLimitsSection />
    </I18nProvider>
  );
};

describe('RunLimitsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders exactly three categories and keeps their counts visible while enforcement is off', () => {
    setup(
      response({
        enabled: false,
        limits: {
          detection: 100,
          investigation: 30,
          ki_extraction: 0,
        },
        counts: {
          detection: 14,
          investigation: 6,
          ki_extraction: 25,
        },
      })
    );

    expect(screen.getAllByTestId(/^significantEventsRunLimitRow-/)).toHaveLength(3);
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Investigation')).toBeInTheDocument();
    expect(screen.getByText('Knowledge indicator extraction')).toBeInTheDocument();
    expect(screen.queryByText('Memory updates')).not.toBeInTheDocument();
    expect(screen.getByTestId('significantEventsRunLimitCount-detection')).toHaveTextContent(
      '14 counted scheduled admissions today'
    );
    expect(screen.getByTestId('significantEventsRunLimitCount-investigation')).toHaveTextContent(
      '6 counted scheduled admissions today'
    );
    expect(screen.getByTestId('significantEventsRunLimitCount-ki_extraction')).toHaveTextContent(
      '25 counted scheduled admissions today'
    );
    expect(screen.getByTestId('significantEventsRunLimitInput-ki_extraction')).toHaveValue(0);
    expect(screen.getByTestId('significantEventsRunLimitsEnforcementSwitch')).not.toBeChecked();
  });

  it('prevents read-only users from editing the switch or limits', () => {
    setup(response({ canManage: false }));

    expect(screen.getByTestId('significantEventsRunLimitsEnforcementSwitch')).toBeDisabled();
    for (const group of ['detection', 'investigation', 'ki_extraction']) {
      expect(screen.getByTestId(`significantEventsRunLimitInput-${group}`)).toBeDisabled();
    }
    expect(screen.getByText('Deployment-wide privilege required')).toBeInTheDocument();
  });

  it('saves zero as unlimited and sends only the changed category', async () => {
    setup();
    fireEvent.change(screen.getByTestId('significantEventsRunLimitInput-detection'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByTestId('significantEventsSaveRunLimitsButton'));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        limits: { detection: 0 },
      })
    );
  });

  it('validates daily limits locally before saving', () => {
    setup();
    fireEvent.change(screen.getByTestId('significantEventsRunLimitInput-detection'), {
      target: { value: '' },
    });

    expect(screen.getByText(/Enter a whole number from 0 to/)).toBeInTheDocument();
    expect(screen.getByTestId('significantEventsSaveRunLimitsButton')).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it('warns before lowering a finite limit below the current count', async () => {
    setup(
      response({
        counts: {
          detection: 84,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );
    fireEvent.change(screen.getByTestId('significantEventsRunLimitInput-detection'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByTestId('significantEventsSaveRunLimitsButton'));

    expect(await screen.findByText('Lower limits below today’s count?')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save lower limits' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        limits: { detection: 5 },
      })
    );
  });

  it('warns when enabling enforcement would immediately deny a category', async () => {
    setup(
      response({
        enabled: false,
        counts: {
          detection: 100,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );
    fireEvent.click(screen.getByTestId('significantEventsRunLimitsEnforcementSwitch'));
    fireEvent.click(screen.getByTestId('significantEventsSaveRunLimitsButton'));

    expect(await screen.findByText('Enable enforcement with reached limits?')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Enable and save changes' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        enabled: true,
      })
    );
  });

  it('warns before disabling enforcement', async () => {
    setup(
      response({
        counts: {
          detection: 100,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );
    expect(screen.getByTestId('significantEventsRunLimitsBanner')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('significantEventsRunLimitsEnforcementSwitch'));
    expect(screen.queryByTestId('significantEventsRunLimitsBanner')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('significantEventsSaveRunLimitsButton'));

    expect(await screen.findByText('Disable daily run limits?')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Disable and save changes' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        enabled: false,
      })
    );
  });

  it('explains critical investigation continuation without claiming an exception count', () => {
    setup(
      response({
        counts: {
          detection: 4,
          investigation: 45,
          ki_extraction: 2,
        },
      })
    );

    expect(
      screen.getByTestId('significantEventsInvestigationCriticalContinuation')
    ).toHaveTextContent('Critical scheduled investigations continue beyond the daily limit.');
    expect(screen.queryByText(/critical override/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/critical exception/i)).not.toBeInTheDocument();
  });

  it('clears the exhaustion banner immediately when a draft raises the reached limit', () => {
    setup(
      response({
        counts: {
          detection: 100,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );
    expect(screen.getByTestId('significantEventsRunLimitsBanner')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('significantEventsRunLimitInput-detection'), {
      target: { value: '101' },
    });

    expect(screen.queryByTestId('significantEventsRunLimitsBanner')).not.toBeInTheDocument();
  });

  it('shows the UTC reset value supplied by the API window', () => {
    setup(
      response({
        window: {
          start: '2040-01-02T00:00:00.000Z',
          resetsAt: '2040-01-03T00:00:00.000Z',
          timezone: 'UTC',
        },
      })
    );

    expect(screen.getByTestId('significantEventsRunLimitsResetTime')).toHaveTextContent(
      'The current UTC day resets at 2040-01-03T00:00:00.000Z.'
    );
  });

  it('retains a dirty draft when the query receives a background update', () => {
    const { rerender } = setup();
    fireEvent.change(screen.getByTestId('significantEventsRunLimitInput-detection'), {
      target: { value: '80' },
    });

    setQueryResponse(
      response({
        limits: {
          detection: 90,
          investigation: 30,
          ki_extraction: 20,
        },
        counts: {
          detection: 8,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );
    rerender(
      <I18nProvider>
        <RunLimitsSection />
      </I18nProvider>
    );

    expect(screen.getByTestId('significantEventsRunLimitInput-detection')).toHaveValue(80);
    expect(screen.getByTestId('significantEventsRunLimitCount-detection')).toHaveTextContent(
      '8 counted scheduled admissions today'
    );
  });

  it('retains the draft and shows an actionable error after a failed write', async () => {
    setup();
    save.mockRejectedValueOnce(new Error('server unavailable'));
    fireEvent.change(screen.getByTestId('significantEventsRunLimitInput-detection'), {
      target: { value: '80' },
    });
    fireEvent.click(screen.getByTestId('significantEventsSaveRunLimitsButton'));

    expect(await screen.findByText('Could not save daily run limits')).toBeInTheDocument();
    expect(screen.getByText(/server unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByTestId('significantEventsRunLimitInput-detection')).toHaveValue(80);
  });
});
