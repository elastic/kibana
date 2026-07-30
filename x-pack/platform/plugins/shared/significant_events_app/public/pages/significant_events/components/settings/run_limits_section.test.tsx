/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  RUN_BUDGET_GROUP_ENGINE,
  RUN_BUDGET_GROUP_IDS,
  type RunBudgetGroupId,
  type RunBudgetGroupUsage,
  type RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';
import {
  useRunQuotas,
  useUpdateRunQuotas,
} from '../../../../hooks/use_significant_events_run_quotas';
import { RunLimitsSection } from './run_limits_section';

jest.mock('../../../../hooks/use_significant_events_run_quotas');

const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;
const mockUseUpdateRunQuotas = useUpdateRunQuotas as jest.MockedFunction<typeof useUpdateRunQuotas>;

const save = jest.fn().mockResolvedValue(undefined);
const refetch = jest.fn();

const group = (
  id: RunBudgetGroupId,
  overrides: Partial<RunBudgetGroupUsage> = {}
): RunBudgetGroupUsage => {
  const limit = overrides.limit ?? { enabled: true, max: 10 };
  const used = overrides.used ?? 0;
  return {
    group: id,
    engine: RUN_BUDGET_GROUP_ENGINE[id],
    limit,
    used,
    remaining: limit.enabled ? Math.max(limit.max - used, 0) : null,
    exhausted: limit.enabled && used >= limit.max,
    byTrigger: {},
    ...overrides,
  };
};

const quotas = (overrides: Partial<RunQuotasResponse> = {}): RunQuotasResponse => ({
  settings: {
    timezone: 'UTC',
    limits: Object.fromEntries(
      RUN_BUDGET_GROUP_IDS.map((id) => [id, { enabled: true, max: 10 }])
    ) as RunQuotasResponse['settings']['limits'],
  },
  window: {
    start: '2026-07-30T00:00:00.000Z',
    // Two hours out, so the countdown copy is deterministic.
    resetsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    timezone: 'UTC',
  },
  groups: RUN_BUDGET_GROUP_IDS.map((id) => group(id)),
  ledgerUnavailable: false,
  ...overrides,
});

const setup = ({
  data,
  isLoading = false,
  isError = false,
  canManage = true,
  isSaving = false,
}: {
  data?: RunQuotasResponse;
  isLoading?: boolean;
  isError?: boolean;
  canManage?: boolean;
  isSaving?: boolean;
} = {}) => {
  mockUseRunQuotas.mockReturnValue({
    data,
    isLoading,
    isError,
    refetch,
  } as unknown as ReturnType<typeof useRunQuotas>);
  mockUseUpdateRunQuotas.mockReturnValue({ save, isSaving });

  return render(
    <I18nProvider>
      <RunLimitsSection canManage={canManage} />
    </I18nProvider>
  );
};

describe('RunLimitsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one row per budget group with its current usage', () => {
    setup({
      data: quotas({
        groups: [
          group('ki_extraction', { used: 2, limit: { enabled: true, max: 5 } }),
          group('memory', { used: 1 }),
          group('detection', { used: 7, limit: { enabled: true, max: 20 } }),
          group('investigation', { used: 3 }),
        ],
      }),
    });

    expect(screen.getByTestId('streams-settings-run-limit-usage-ki_extraction')).toHaveTextContent(
      '2 of 5 runs used today'
    );
    expect(screen.getByTestId('streams-settings-run-limit-usage-detection')).toHaveTextContent(
      '7 of 20 runs used today'
    );
    // Both context-engine groups get their own limit.
    expect(screen.getByTestId('streams-settings-run-limit-max-ki_extraction')).toHaveValue(5);
    expect(screen.getByTestId('streams-settings-run-limit-max-memory')).toHaveValue(10);
    expect(screen.getByTestId('streams-settings-run-limits-reset')).toHaveTextContent(
      'Counters reset in 2h 0m.'
    );
  });

  it('says automated runs are paused for an exhausted group', () => {
    setup({
      data: quotas({
        groups: [group('detection', { used: 20, limit: { enabled: true, max: 20 } })],
      }),
    });

    expect(screen.getByTestId('streams-settings-run-limit-usage-detection')).toHaveTextContent(
      'Automated runs are paused until the counter resets.'
    );
  });

  it('hides the run count field and reports no limit when a group is unlimited', () => {
    setup({
      data: quotas({
        groups: [group('memory', { used: 4, limit: { enabled: false, max: 10 } })],
      }),
    });

    expect(screen.queryByTestId('streams-settings-run-limit-max-memory')).not.toBeInTheDocument();
    expect(screen.getByTestId('streams-settings-run-limit-usage-memory')).toHaveTextContent(
      '4 runs today (no limit)'
    );
  });

  it('only submits the groups the user actually changed', async () => {
    setup({ data: quotas() });

    // Nothing edited yet, so there is nothing to save.
    expect(screen.queryByTestId('streams-settings-run-limits-save')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('streams-settings-run-limit-max-detection'), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByTestId('streams-settings-run-limits-save'));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ limits: { detection: { enabled: true, max: 25 } } })
    );
  });

  it('submits a disabled limit when the switch is turned off', async () => {
    setup({ data: quotas() });

    fireEvent.click(screen.getByTestId('streams-settings-run-limit-enabled-investigation'));
    fireEvent.click(screen.getByTestId('streams-settings-run-limits-save'));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ limits: { investigation: { enabled: false, max: 10 } } })
    );
  });

  it('discards edits on cancel', async () => {
    setup({ data: quotas() });

    const field = screen.getByTestId('streams-settings-run-limit-max-detection');
    fireEvent.change(field, { target: { value: '25' } });
    expect(field).toHaveValue(25);

    fireEvent.click(screen.getByTestId('streams-settings-run-limits-cancel'));

    await waitFor(() =>
      expect(screen.getByTestId('streams-settings-run-limit-max-detection')).toHaveValue(10)
    );
    expect(screen.queryByTestId('streams-settings-run-limits-save')).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it('lets a read-only user see the limits but not edit them', () => {
    setup({ data: quotas(), canManage: false });

    expect(screen.getByTestId('streams-settings-run-limits-no-manage')).toBeInTheDocument();
    expect(screen.getByTestId('streams-settings-run-limit-max-detection')).toBeDisabled();
    expect(screen.getByTestId('streams-settings-run-limit-enabled-detection')).toBeDisabled();
  });

  it('offers a retry when the limits cannot be loaded', () => {
    setup({ isError: true });

    expect(screen.getByTestId('streams-settings-run-limits-error')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('streams-settings-run-limits-retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('warns that usage is unknown when the run ledger cannot be read', () => {
    setup({ data: quotas({ ledgerUnavailable: true }) });

    expect(screen.getByTestId('streams-settings-run-limits-usage-unavailable')).toBeInTheDocument();
  });
});
