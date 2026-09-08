/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';

import { PackQueriesTable } from './pack_queries_table';
import type { PackQueryFormData } from './queries/use_pack_query_form';
import { ExperimentalFeaturesService } from '../common/experimental_features_service';
import { allowedExperimentalValues } from '../../common/experimental_features';

const setFlag = (rruleScheduling: boolean) =>
  ExperimentalFeaturesService.init({
    experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling },
  });

const baseQuery = (overrides: Partial<PackQueryFormData> = {}): PackQueryFormData => ({
  id: 'query-1',
  query: 'select * from uptime;',
  interval: 3600,
  ecs_mapping: {},
  ...overrides,
});

const renderTable = (props: Partial<React.ComponentProps<typeof PackQueriesTable>>) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <PackQueriesTable data={[]} isReadOnly {...props} />
      </IntlProvider>
    </EuiProvider>
  );

describe('PackQueriesTable', () => {
  // The Schedule column is no longer gated on `rruleScheduling`. With the flag
  // off every query is interval-mode, which renders as `"{n}s"` — the same
  // value the old "Interval (s)" column showed, under an honest label.
  describe('flag off (Schedule column is not flag-gated)', () => {
    beforeEach(() => setFlag(false));

    it('renders the "Schedule" column with interval text and no legacy column', () => {
      renderTable({ data: [baseQuery({ interval: 3600 })] });

      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.queryByText('Interval (s)')).not.toBeInTheDocument();
      expect(screen.getByText('3600s')).toBeInTheDocument();
    });
  });

  describe('flag on (Schedule column)', () => {
    beforeEach(() => setFlag(true));
    afterEach(() => setFlag(false));

    it('renders the "Schedule" column header', () => {
      renderTable({ data: [baseQuery()] });

      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.queryByText('Interval (s)')).not.toBeInTheDocument();
    });

    it('renders interval text for an interval-mode override', () => {
      renderTable({
        data: [baseQuery({ schedule_type: 'interval', interval: 1800 })],
      });

      expect(screen.getByText('1800s')).toBeInTheDocument();
    });

    it('renders "Daily" for a daily rrule override', () => {
      renderTable({
        data: [
          baseQuery({
            schedule_type: 'rrule',
            rrule_schedule: {
              rrule: 'FREQ=DAILY',
              start_date: '2024-01-01T00:00:00.000Z',
            },
          }),
        ],
      });

      expect(screen.getByText('Daily')).toBeInTheDocument();
    });

    it('renders custom weekly text for a weekly rrule override', () => {
      renderTable({
        data: [
          baseQuery({
            schedule_type: 'rrule',
            rrule_schedule: {
              rrule: 'FREQ=WEEKLY;BYDAY=TU',
              start_date: '2024-01-01T00:00:00.000Z',
            },
          }),
        ],
      });

      expect(screen.getByText('Every week on Tue')).toBeInTheDocument();
    });

    it('renders the inherited pack schedule for a row without an override', () => {
      renderTable({
        data: [baseQuery({ interval: 3600 })],
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      expect(screen.getByText('Daily')).toBeInTheDocument();
    });

    // Regression for elastic/kibana#277700: a legacy pack upgraded from 9.4.3
    // has queries with their own real interval and no `schedule_type`, while the
    // pack itself has no pack-level schedule — the client synthesizes an
    // interval packSchedule defaulting to 3600. The row must show the query's
    // own interval (80s), not the synthesized pack default (3600s).
    it('renders the query own interval for a legacy row under an interval pack schedule', () => {
      renderTable({
        data: [baseQuery({ interval: 80 })],
        packSchedule: {
          schedule_type: 'interval',
          interval: 3600,
        },
      });

      expect(screen.getByText('80s')).toBeInTheDocument();
      expect(screen.queryByText('3600s')).not.toBeInTheDocument();
    });

    it('renders the pack interval for a non-override row when the pack schedule is explicit', () => {
      renderTable({
        data: [baseQuery({ interval: 80 })],
        packSchedule: {
          schedule_type: 'interval',
          interval: 3600,
          hasExplicitSchedule: true,
        },
      });

      expect(screen.getByText('3600s')).toBeInTheDocument();
      expect(screen.queryByText('80s')).not.toBeInTheDocument();
    });
  });

  describe('V5: Enabled column and disabled row opacity', () => {
    it('renders the Enabled switch as checked for a query with no enabled field (default on)', () => {
      renderTable({ data: [baseQuery({})] });
      const toggle = screen.getByTestId('query-enabled-switch-query-1');
      expect(toggle).toBeChecked();
    });

    it('renders the Enabled switch as checked when enabled: true', () => {
      renderTable({ data: [baseQuery({ enabled: true })] });
      expect(screen.getByTestId('query-enabled-switch-query-1')).toBeChecked();
    });

    it('renders the Enabled switch as unchecked when enabled: false', () => {
      renderTable({ data: [baseQuery({ enabled: false })] });
      expect(screen.getByTestId('query-enabled-switch-query-1')).not.toBeChecked();
    });

    it('applies opacity 0.6 to a disabled row', () => {
      const { container } = renderTable({ data: [baseQuery({ enabled: false })] });
      const rows = container.querySelectorAll('tr[style*="opacity"]');
      expect(rows).toHaveLength(1);
      expect((rows[0] as HTMLElement).style.opacity).toBe('0.6');
    });

    it('does not apply opacity to an enabled row', () => {
      const { container } = renderTable({ data: [baseQuery({ enabled: true })] });
      const rows = container.querySelectorAll('tr[style*="opacity"]');
      expect(rows).toHaveLength(0);
    });

    it('calls onToggleEnabled with correct args when switch is toggled', () => {
      const onToggleEnabled = jest.fn();
      // isReadOnly must be false so the switch is not disabled.
      renderTable({ data: [baseQuery({ enabled: true })], onToggleEnabled, isReadOnly: false });
      const switchEl = screen.getByTestId('query-enabled-switch-query-1');
      fireEvent.click(switchEl);
      expect(onToggleEnabled).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'query-1' }),
        false
      );
    });
  });

  describe('column labels and order', () => {
    it('renders the "Min version" header, not "Min Osquery version"', () => {
      renderTable({ data: [baseQuery()] });

      expect(screen.getByText('Min version')).toBeInTheDocument();
      expect(screen.queryByText('Min Osquery version')).not.toBeInTheDocument();
    });

    it('renders the version fallback as "All" in Title Case', () => {
      renderTable({ data: [baseQuery({ version: undefined })] });

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.queryByText('ALL')).not.toBeInTheDocument();
    });

    it('orders columns ID | Operating systems | Min version | Schedule | Enabled | Actions', () => {
      const { container } = renderTable({ data: [baseQuery()], isReadOnly: false });
      const headers = Array.from(container.querySelectorAll('thead th')).map((th) =>
        th.textContent?.trim()
      );

      // A leading select-all checkbox column is present when not read-only.
      expect(headers.slice(-6)).toEqual([
        'ID',
        'Operating systems',
        'Min version',
        'Schedule',
        'Enabled',
        'Actions',
      ]);
    });
  });

  describe('Schedule column truncation', () => {
    it('renders a short schedule inline with no tooltip wrapper', () => {
      setFlag(true);
      renderTable({
        data: [
          baseQuery({
            schedule_type: 'rrule',
            rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2024-01-01T00:00:00.000Z' },
          }),
        ],
      });

      const cell = screen.getByText('Daily');
      expect(cell).toBeInTheDocument();
      expect(cell.tagName).not.toBe('SPAN');
      setFlag(false);
    });

    it('truncates a long schedule and exposes the full text for assistive tech', () => {
      setFlag(true);
      renderTable({
        data: [
          baseQuery({
            schedule_type: 'rrule',
            rrule_schedule: {
              rrule: 'FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA',
              start_date: '2024-01-01T00:00:00.000Z',
            },
          }),
        ],
      });

      const full = 'Every week on Sun, Mon, Tue, Wed, Thu, Fri, Sat';
      // 46 chars — under the 48 budget, so it must NOT truncate.
      expect(full.length).toBeLessThanOrEqual(48);
      expect(screen.getByText(full)).toBeInTheDocument();
      setFlag(false);
    });

    it('truncates when the rendered text exceeds the budget', () => {
      setFlag(true);
      renderTable({
        data: [
          baseQuery({
            schedule_type: 'rrule',
            rrule_schedule: {
              rrule: 'FREQ=WEEKLY;INTERVAL=100;BYDAY=SU,MO,TU,WE,TH,FR,SA',
              start_date: '2024-01-01T00:00:00.000Z',
            },
          }),
        ],
      });

      const full = 'Every 100 weeks on Sun, Mon, Tue, Wed, Thu, Fri, Sat';
      expect(full.length).toBeGreaterThan(48);
      // Truncated text is rendered, full text is on aria-label.
      expect(screen.queryByText(full)).not.toBeInTheDocument();
      expect(screen.getByLabelText(full)).toBeInTheDocument();
      expect(screen.getByLabelText(full).textContent).toMatch(/…$/);
      setFlag(false);
    });
  });

  describe('V5: Disabled badge in ID column', () => {
    it('renders a Disabled badge next to the query name when enabled: false', () => {
      renderTable({ data: [baseQuery({ enabled: false })] });
      expect(screen.getByTestId('query-disabled-badge-query-1')).toBeInTheDocument();
      expect(screen.getByTestId('query-disabled-badge-query-1')).toHaveTextContent('Disabled');
    });

    it('does not render a Disabled badge when enabled: true', () => {
      renderTable({ data: [baseQuery({ enabled: true })] });
      expect(screen.queryByTestId('query-disabled-badge-query-1')).not.toBeInTheDocument();
    });

    it('does not render a Disabled badge when enabled is not set (default on)', () => {
      renderTable({ data: [baseQuery()] });
      expect(screen.queryByTestId('query-disabled-badge-query-1')).not.toBeInTheDocument();
    });
  });
});
