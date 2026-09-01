/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  RunBudgetGroupId,
  RunBudgetGroupUsage,
  RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';
import {
  useRunQuotas,
  useRunQuotaStatus,
  useSkippedRunQuotaInvestigations,
  useUpdateRunQuotaEnforcement,
  useUpdateRunQuotas,
} from '../../../../hooks/use_significant_events_run_quotas';
import { RunLimitsSection } from './run_limits_section';

jest.mock('../../../../hooks/use_significant_events_run_quotas');
jest.mock('../../../../hooks/use_significant_events_app_router', () => ({
  useSignificantEventsAppRouter: () => ({ link: jest.fn().mockReturnValue('#event') }),
}));

const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;
const mockUseRunQuotaStatus = useRunQuotaStatus as jest.MockedFunction<typeof useRunQuotaStatus>;
const mockUseUpdateRunQuotas = useUpdateRunQuotas as jest.MockedFunction<typeof useUpdateRunQuotas>;
const mockUseUpdateRunQuotaEnforcement = useUpdateRunQuotaEnforcement as jest.MockedFunction<
  typeof useUpdateRunQuotaEnforcement
>;
const mockUseSkippedRunQuotaInvestigations =
  useSkippedRunQuotaInvestigations as jest.MockedFunction<typeof useSkippedRunQuotaInvestigations>;

const save = jest.fn().mockResolvedValue(undefined);
const updateEnforcement = jest.fn().mockResolvedValue({ enabled: true });
const refetch = jest.fn();

const group = (
  groupId: RunBudgetGroupId,
  overrides: Partial<RunBudgetGroupUsage> = {}
): RunBudgetGroupUsage => {
  const limit = overrides.limit ?? { enabled: true, max: 10 };
  const counted = overrides.counted ?? 0;
  return {
    group: groupId,
    limit,
    used: overrides.used ?? 0,
    counted,
    remaining: limit.enabled ? Math.max(0, limit.max - counted) : null,
    withinLimitGrantCount: 0,
    criticalPastLimitGrantCount: 0,
    totalSkipped: 0,
    decisionsEvicted: false,
    ...overrides,
  };
};

const quotas = (overrides: Partial<RunQuotasResponse> = {}): RunQuotasResponse => ({
  settings: {
    timezone: 'UTC',
    limits: {
      detection: { enabled: true, max: 100 },
      investigation: { enabled: true, max: 30 },
      ki_extraction: { enabled: true, max: 20 },
      memory: { enabled: false, max: 0 },
    },
  },
  window: {
    start: '2026-08-31T00:00:00.000Z',
    resetsAt: '2026-09-01T00:00:00.000Z',
    timezone: 'UTC',
  },
  groups: [
    group('detection', { limit: { enabled: true, max: 100 } }),
    group('investigation', { limit: { enabled: true, max: 30 } }),
    group('ki_extraction', { limit: { enabled: true, max: 20 } }),
    group('memory', { limit: { enabled: false, max: 0 } }),
  ],
  ...overrides,
});

const setup = ({
  response = quotas(),
  enabled = true,
  canManageLimits = true,
}: {
  response?: RunQuotasResponse;
  enabled?: boolean;
  canManageLimits?: boolean;
} = {}) => {
  mockUseRunQuotas.mockReturnValue({
    data: response,
    isLoading: false,
    isError: false,
    refetch,
  } as unknown as ReturnType<typeof useRunQuotas>);
  mockUseRunQuotaStatus.mockReturnValue({
    data: {
      enabled,
      canManageLimits,
    },
    isLoading: false,
    isError: false,
    refetch,
  } as unknown as ReturnType<typeof useRunQuotaStatus>);
  mockUseUpdateRunQuotas.mockReturnValue({ save, isSaving: false });
  mockUseUpdateRunQuotaEnforcement.mockReturnValue({
    updateEnforcement,
    isUpdating: false,
  });

  return render(
    <I18nProvider>
      <RunLimitsSection />
    </I18nProvider>
  );
};

describe('RunLimitsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSkippedRunQuotaInvestigations.mockReturnValue({
      data: {
        rows: [],
        totalSkipped: 0,
        truncated: false,
        decisionsEvicted: false,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSkippedRunQuotaInvestigations>);
  });

  it('shows labelled execution and ledger totals, the investigation split, and count-only memory', () => {
    setup({
      response: quotas({
        groups: [
          group('detection', {
            used: 84,
            counted: 80,
            limit: { enabled: true, max: 100 },
          }),
          group('investigation', {
            used: 34,
            counted: 31,
            withinLimitGrantCount: 30,
            criticalPastLimitGrantCount: 1,
            limit: { enabled: true, max: 30 },
          }),
          group('ki_extraction', { limit: { enabled: true, max: 20 } }),
          group('memory', { used: 5, limit: { enabled: false, max: 0 } }),
        ],
      }),
    });

    expect(screen.getByTestId('significantEventsRunLimitUsage-detection')).toHaveTextContent(
      '84 runs today · 80 counted'
    );
    expect(screen.getByTestId('significantEventsRunLimitInvestigationSplit')).toHaveTextContent(
      '30 regular grants · 1 critical override'
    );
    expect(screen.getByText('5 runs today')).toBeInTheDocument();
    expect(screen.queryByTestId('significantEventsRunLimitInput-memory')).not.toBeInTheDocument();
  });

  it('shows earlier denials without claiming a raised limit is still reached', () => {
    setup({
      response: quotas({
        groups: [
          group('detection', { limit: { enabled: true, max: 100 } }),
          group('investigation', {
            counted: 31,
            totalSkipped: 23,
            limit: { enabled: true, max: 60 },
          }),
          group('ki_extraction', { limit: { enabled: true, max: 20 } }),
          group('memory', { limit: { enabled: false, max: 0 } }),
        ],
      }),
    });

    expect(screen.queryByText(/Limit reached/)).not.toBeInTheDocument();
    expect(
      screen.getByText('Earlier today, the gate denied 23 investigation requests.')
    ).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('saves only the dirty group as a patch and models zero as unlimited', async () => {
    setup();
    fireEvent.change(screen.getByTestId('significantEventsRunLimitInput-detection'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByTestId('significantEventsSaveRunLimitsButton'));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        limits: { detection: { enabled: false, max: 0 } },
      })
    );
  });

  it('disables saving while a numeric field is empty mid-edit', () => {
    setup();
    fireEvent.change(screen.getByTestId('significantEventsRunLimitInput-detection'), {
      target: { value: '' },
    });

    expect(screen.getByTestId('significantEventsSaveRunLimitsButton')).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it('warns before lowering a limit below today’s ledger count', async () => {
    setup({
      response: quotas({
        groups: [
          group('detection', {
            counted: 84,
            limit: { enabled: true, max: 100 },
          }),
          group('investigation', { limit: { enabled: true, max: 30 } }),
          group('ki_extraction', { limit: { enabled: true, max: 20 } }),
          group('memory', { limit: { enabled: false, max: 0 } }),
        ],
      }),
    });
    fireEvent.change(screen.getByTestId('significantEventsRunLimitInput-detection'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByTestId('significantEventsSaveRunLimitsButton'));

    expect(await screen.findByText('Lower limits below today’s usage?')).toBeInTheDocument();
    expect(screen.getByText(/Work already admitted will finish/)).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Save lower limits'));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        limits: { detection: { enabled: true, max: 5 } },
      })
    );
  });

  it('keeps limit rows absent while enforcement is off and enables with edited values', async () => {
    setup({ enabled: false });

    expect(
      screen.queryByTestId('significantEventsRunLimitInput-detection')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('significantEventsEnableRunLimitsButton'));
    expect(screen.getByText('Enable daily run limits')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('significantEventsRunLimitInput-detection'), {
      target: { value: '75' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Enable run limits' })
    );

    await waitFor(() =>
      expect(updateEnforcement).toHaveBeenCalledWith({
        enabled: true,
        limits: {
          detection: { enabled: true, max: 75 },
          investigation: { enabled: true, max: 30 },
          ki_extraction: { enabled: true, max: 20 },
        },
      })
    );
  });

  it('gates editing on the deployment-wide management result', () => {
    setup({ canManageLimits: false });

    expect(screen.getByTestId('significantEventsRunLimitInput-detection')).toBeDisabled();
    expect(screen.getByText('Deployment-wide privilege required')).toBeInTheDocument();
  });

  it('describes gate denials and space-limited rows in the review flyout', async () => {
    mockUseSkippedRunQuotaInvestigations.mockReturnValue({
      data: {
        rows: [
          {
            eventUuid: 'event-uuid',
            eventId: 'event-id',
            severity: '60-high',
            decidedAt: '2026-08-31T10:00:00.000Z',
          },
        ],
        totalSkipped: 23,
        truncated: true,
        decisionsEvicted: true,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSkippedRunQuotaInvestigations>);
    setup({
      response: quotas({
        groups: [
          group('detection', { limit: { enabled: true, max: 100 } }),
          group('investigation', {
            counted: 30,
            totalSkipped: 23,
            limit: { enabled: true, max: 30 },
          }),
          group('ki_extraction', { limit: { enabled: true, max: 20 } }),
          group('memory', { limit: { enabled: false, max: 0 } }),
        ],
      }),
    });

    fireEvent.click(screen.getByText('Review'));

    expect(await screen.findByTestId('runLimitReviewFlyout')).toHaveTextContent(
      'limited to the current space'
    );
    expect(screen.getByTestId('runLimitReviewFlyout')).toHaveTextContent(
      'The gate denied the request'
    );
    expect(screen.getByTestId('runLimitReviewFlyout')).toHaveTextContent(
      'Showing the newest 200 rows'
    );
    expect(screen.getByTestId('runLimitReviewFlyout')).toHaveTextContent(
      'retries can appear more than once'
    );
  });
});
