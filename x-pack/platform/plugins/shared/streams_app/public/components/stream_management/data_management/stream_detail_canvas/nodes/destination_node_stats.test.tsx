/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EMPTY_DESTINATION_FAILED } from '../../../../../services/unit_stats_client/map_stats_response';
import type {
  DestinationFailedView,
  DestinationStatsView,
} from '../../../../../services/unit_stats_client/types';
import type { StatsEntry } from '../../../../unit_stats/state_management/types';
import { DestinationNodeStats } from './destination_node_stats';

// The sparklines are charts, which need the services of the page, and have tests of their own.
jest.mock('../../../../streams_layout/destinations/failure_sparkline', () => ({
  FailureSparkline: () => null,
}));
// What the popover fetches when it opens needs the services of the page, and has tests of its own.
jest.mock('../../../../unit_stats/use_destination_popover_failures', () => ({
  useDestinationPopoverFailures: () => undefined,
}));

const mockUseDestinationStats = jest.fn();

jest.mock('../../../../unit_stats/state_management/use_stats_manager', () => ({
  useDestinationStats: (id: string | undefined) => mockUseDestinationStats(id),
}));

const statsWith = ({
  eventsRate = null,
  latencyAverage = null,
}: Partial<Pick<DestinationStatsView, 'eventsRate' | 'latencyAverage'>>): DestinationStatsView => ({
  eventsRate,
  eventsTotal: null,
  failed: EMPTY_DESTINATION_FAILED,
  latencyAverage,
  series: { bucketMs: 300000, points: [] },
});

const statsWithRate = (eventsRate: number | null): DestinationStatsView =>
  statsWith({ eventsRate });

const renderFooter = (
  entry: StatsEntry<DestinationStatsView> | undefined,
  { hasSavedSource = true, ...props }: { indexCount?: number; hasSavedSource?: boolean } = {}
) => {
  mockUseDestinationStats.mockReturnValue(entry);
  return render(
    <DestinationNodeStats destinationId="es-prod" hasSavedSource={hasSavedSource} {...props} />
  );
};

const text = (testId: string) => screen.getByTestId(testId).textContent;
const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

beforeEach(() => {
  mockUseDestinationStats.mockReset();
});

describe('DestinationNodeStats', () => {
  it('reads the stats of its destination', () => {
    renderFooter(undefined);

    expect(mockUseDestinationStats).toHaveBeenCalledWith('es-prod');
  });

  describe('a destination that no source feeds in the saved unit', () => {
    it('reads no stats, so nothing is registered or requested', () => {
      renderFooter(undefined, { hasSavedSource: false });

      expect(mockUseDestinationStats).toHaveBeenCalledWith(undefined);
      expect(mockUseDestinationStats).not.toHaveBeenCalledWith('es-prod');
    });

    it('shows Data not flowing in, and no numbers', () => {
      renderFooter(undefined, { hasSavedSource: false });

      expect(text('streamsCanvasDestinationNotFlowing')).toBe('Data not flowing in');
      expect(isShown('streamsCanvasDestinationRate')).toBe(false);
      expect(isShown('streamsCanvasDestinationLatency')).toBe(false);
    });

    it('shows no numbers even when an entry is returned', () => {
      renderFooter(
        { status: 'ready', stats: statsWith({ eventsRate: 3700, latencyAverage: 0.012 }) },
        { hasSavedSource: false }
      );

      expect(text('streamsCanvasDestinationNotFlowing')).toBe('Data not flowing in');
      expect(isShown('streamsCanvasDestinationRate')).toBe(false);
    });

    it('still shows the index count', () => {
      renderFooter(undefined, { hasSavedSource: false, indexCount: 3 });

      expect(text('streamsCanvasDestinationIndexCount')).toBe('3 indices');
    });

    it('reads the stats again once a source feeds it', () => {
      const { rerender } = renderFooter(undefined, { hasSavedSource: false });
      rerender(<DestinationNodeStats destinationId="es-prod" hasSavedSource />);

      expect(mockUseDestinationStats).toHaveBeenLastCalledWith('es-prod');
      expect(isShown('streamsCanvasDestinationNotFlowing')).toBe(false);
    });
  });

  describe('a destination with data', () => {
    it('shows the rate and the latency', () => {
      renderFooter({
        status: 'ready',
        stats: statsWith({ eventsRate: 3700, latencyAverage: 0.012 }),
      });

      expect(text('streamsCanvasDestinationRate')).toBe('3.7k/s');
      expect(text('streamsCanvasDestinationLatency')).toBe('12ms');
    });

    it('keeps showing the values while a refresh has failed, and marks them as stale', () => {
      renderFooter({
        status: 'stale',
        stats: statsWith({ eventsRate: 3700, latencyAverage: 0.012 }),
      });

      expect(text('streamsCanvasDestinationRate')).toBe('3.7k/s');
      expect(text('streamsCanvasDestinationLatency')).toBe('12ms');
      expect(isShown('streamsCanvasDestinationStale')).toBe(true);
    });

    it('shows no stale mark for values that are current', () => {
      renderFooter({ status: 'ready', stats: statsWithRate(3700) });

      expect(isShown('streamsCanvasDestinationStale')).toBe(false);
    });
  });

  describe('a destination with no rate and no latency', () => {
    it.each<[string, StatsEntry<DestinationStatsView>]>([
      ['a result with no data', { status: 'noData', stats: statsWith({}) }],
      ['a value that went stale', { status: 'stale', stats: statsWith({}) }],
    ])('shows Data not flowing in, and no numbers, for %s', (_description, entry) => {
      renderFooter(entry);

      expect(text('streamsCanvasDestinationNotFlowing')).toBe('Data not flowing in');
      expect(isShown('streamsCanvasDestinationRate')).toBe(false);
      expect(isShown('streamsCanvasDestinationLatency')).toBe(false);
    });

    it('marks a stale no-data value as stale, like any other value', () => {
      renderFooter({ status: 'stale', stats: statsWith({}) });

      expect(isShown('streamsCanvasDestinationStale')).toBe(true);
    });

    it('shows no not-flowing message once there is a value to show', () => {
      renderFooter({ status: 'ready', stats: statsWith({ eventsRate: 3700 }) });

      expect(isShown('streamsCanvasDestinationNotFlowing')).toBe(false);
    });
  });

  describe('a destination with missing values', () => {
    it.each<[string, StatsEntry<DestinationStatsView>, string, string]>([
      [
        'a rate of exactly 0, which is data',
        { status: 'ready', stats: statsWith({ eventsRate: 0, latencyAverage: 0.012 }) },
        '0/s',
        '12ms',
      ],
      [
        'a rate and no latency',
        { status: 'ready', stats: statsWith({ eventsRate: 3700 }) },
        '3.7k/s',
        '-',
      ],
      [
        'a latency and no rate',
        { status: 'ready', stats: statsWith({ latencyAverage: 0.012 }) },
        '-',
        '12ms',
      ],
    ])('shows %s as a dash for what is missing', (_description, entry, rate, latency) => {
      renderFooter(entry);

      expect(text('streamsCanvasDestinationRate')).toBe(rate);
      expect(text('streamsCanvasDestinationLatency')).toBe(latency);
    });
  });

  describe('when nothing is known yet', () => {
    it.each<[string, StatsEntry<DestinationStatsView> | undefined]>([
      ['no entry yet', undefined],
      ['a request in flight', { status: 'loading' }],
    ])('shows no numbers for %s, and keeps its row', (_description, entry) => {
      renderFooter(entry);

      expect(isShown('streamsCanvasDestinationStats')).toBe(true);
      expect(isShown('streamsCanvasDestinationNotFlowing')).toBe(false);
      expect(isShown('streamsCanvasDestinationRate')).toBe(false);
      expect(isShown('streamsCanvasDestinationLatency')).toBe(false);
      expect(isShown('streamsCanvasDestinationError')).toBe(false);
    });
  });

  describe('when the stats could not be loaded', () => {
    const FAILED: StatsEntry<DestinationStatsView> = {
      status: 'error',
      error: { code: 'unavailable', reason: 'Elasticsearch is unavailable' },
    };

    it('marks the node with a warning, and shows no numbers', () => {
      renderFooter(FAILED);

      expect(isShown('streamsCanvasDestinationStats')).toBe(true);
      expect(isShown('streamsCanvasDestinationError')).toBe(true);
      expect(isShown('streamsCanvasDestinationNotFlowing')).toBe(false);
      expect(isShown('streamsCanvasDestinationRate')).toBe(false);
      expect(isShown('streamsCanvasDestinationLatency')).toBe(false);
    });

    it('explains why in the tooltip of the warning', async () => {
      renderFooter(FAILED);

      fireEvent.mouseOver(screen.getByTestId('streamsCanvasDestinationError'));

      expect(await screen.findByText(/Could not load stats\./)).toBeTruthy();
      expect(await screen.findByText(/Elasticsearch is unavailable/)).toBeTruthy();
    });
  });

  describe('failures', () => {
    const failureClass = (
      rate: number | null,
      percentage: number | null,
      unit = '{item}'
    ): DestinationFailedView['authentication'] => ({ rate, unit, percentage, breakdown: [] });

    const withFailed = (
      failed: Partial<DestinationFailedView>,
      {
        eventsRate = 4.2,
        latencyAverage = 0.17,
      }: { eventsRate?: number | null; latencyAverage?: number | null } = {}
    ): StatsEntry<DestinationStatsView> => ({
      status: 'ready',
      stats: {
        ...statsWith({ eventsRate, latencyAverage }),
        failed: { ...EMPTY_DESTINATION_FAILED, ...failed },
      },
    });

    it.each<[string, Partial<DestinationFailedView>]>([
      ['no data', {}],
      [
        'a percentage and a rate of 0',
        { authentication: failureClass(0, 0), authorization: failureClass(0, 0) },
      ],
    ])('shows no failure icon for %s', (_description, failed) => {
      renderFooter(withFailed(failed));

      expect(isShown('streamsCanvasDestinationFailures')).toBe(false);
    });

    it.each<[string, Partial<DestinationFailedView>]>([
      ['authentication', { authentication: failureClass(0.5, 11.9) }],
      ['authorization', { authorization: failureClass(1.9, 45.2) }],
      ['a rate with no percentage', { authentication: failureClass(0.5, null) }],
    ])('shows the failure icon for %s', (_description, failed) => {
      renderFooter(withFailed(failed));

      expect(isShown('streamsCanvasDestinationFailures')).toBe(true);
    });

    it('lists the failures in the popover, with the percentage first', async () => {
      renderFooter(withFailed({ authentication: failureClass(0.5, 11.9) }));

      fireEvent.mouseOver(screen.getByTestId('streamsCanvasDestinationFailures'));

      const popover = await screen.findByTestId('streamsCanvasDestinationFailuresPopover');
      expect(within(popover).getByText('Delivery failures')).toBeTruthy();
      const summary = 'streamsDestinationFailurePopoverSummary';
      expect(text(`${summary}Subtitle`)).toBe('Of events in the last 15 minutes');
      expect(text(`${summary}AuthenticationPercentage`)).toContain('12%');
      expect(text(`${summary}AuthenticationRate`)).toContain('0.50/s');
    });

    it('names upload attempts for a destination that counts them', async () => {
      renderFooter(withFailed({ authentication: failureClass(0.44, 100, '{request}') }));

      fireEvent.mouseOver(screen.getByTestId('streamsCanvasDestinationFailures'));

      expect(await screen.findByText('Of upload attempts in the last 15 minutes')).toBeTruthy();
    });

    it('keeps the rate and the latency next to the icon', () => {
      renderFooter(withFailed({ authentication: failureClass(0.5, 11.9) }));

      expect(text('streamsCanvasDestinationRate')).toBe('4.2/s');
      expect(text('streamsCanvasDestinationLatency')).toBe('170ms');
    });

    it('does not say that data is not flowing in when there are failures and no rate or latency', () => {
      renderFooter(
        withFailed(
          { authentication: failureClass(0.5, null) },
          { eventsRate: null, latencyAverage: null }
        )
      );

      expect(isShown('streamsCanvasDestinationNotFlowing')).toBe(false);
      expect(isShown('streamsCanvasDestinationFailures')).toBe(true);
    });

    it('still says that data is not flowing in when there are no failures and no rate or latency', () => {
      renderFooter(withFailed({}, { eventsRate: null, latencyAverage: null }));

      expect(isShown('streamsCanvasDestinationNotFlowing')).toBe(true);
      expect(isShown('streamsCanvasDestinationFailures')).toBe(false);
    });

    it('shows the failure icon next to the stale icon of old values', () => {
      const entry = withFailed({ authentication: failureClass(0.5, 11.9) });
      renderFooter({ ...entry, status: 'stale' });

      expect(isShown('streamsCanvasDestinationFailures')).toBe(true);
      expect(isShown('streamsCanvasDestinationStale')).toBe(true);
    });

    it('shows no failure icon when the stats could not be loaded', () => {
      renderFooter({ status: 'error', error: { code: 'unavailable', reason: 'Unavailable' } });

      expect(isShown('streamsCanvasDestinationFailures')).toBe(false);
    });
  });

  describe('stats that loaded in part', () => {
    const PARTIAL: StatsEntry<DestinationStatsView> = {
      status: 'ready',
      stats: statsWith({ eventsRate: 3700, latencyAverage: 0.012 }),
      error: { code: 'error', reason: 'The stats query failed.' },
    };

    it('keeps the numbers, and adds a partial icon', () => {
      renderFooter(PARTIAL);

      expect(text('streamsCanvasDestinationRate')).toBe('3.7k/s');
      expect(text('streamsCanvasDestinationLatency')).toBe('12ms');
      expect(isShown('streamsCanvasDestinationPartial')).toBe(true);
      expect(isShown('streamsCanvasDestinationError')).toBe(false);
    });

    it('says what is missing in the tooltip', async () => {
      renderFooter(PARTIAL);

      fireEvent.mouseOver(screen.getByTestId('streamsCanvasDestinationPartial'));

      expect(await screen.findByText(/Some stats could not be loaded\./)).toBeTruthy();
      expect(await screen.findByText(/The stats query failed\./)).toBeTruthy();
    });

    it('shows only the stale icon when the values are also old', () => {
      renderFooter({ ...PARTIAL, status: 'stale' });

      expect(isShown('streamsCanvasDestinationStale')).toBe(true);
      expect(isShown('streamsCanvasDestinationPartial')).toBe(false);
    });

    it('shows no partial icon for stats with no error', () => {
      renderFooter({ status: 'ready', stats: statsWithRate(3700) });

      expect(isShown('streamsCanvasDestinationPartial')).toBe(false);
    });
  });

  describe('the index count', () => {
    it.each<[number, string]>([
      [1, '1 index'],
      [3, '3 indices'],
    ])('shows %i as "%s"', (indexCount, expected) => {
      renderFooter({ status: 'ready', stats: statsWithRate(3700) }, { indexCount });

      expect(text('streamsCanvasDestinationIndexCount')).toBe(expected);
    });

    it.each<[string, StatsEntry<DestinationStatsView> | undefined]>([
      ['ready', { status: 'ready', stats: statsWithRate(3700) }],
      ['no data', { status: 'noData', stats: statsWithRate(null) }],
      ['loading', { status: 'loading' }],
      ['missing', undefined],
    ])('shows it when the entry is %s', (_status, entry) => {
      renderFooter(entry, { indexCount: 2 });

      expect(text('streamsCanvasDestinationIndexCount')).toBe('2 indices');
    });

    it.each<[string, number | undefined]>([
      ['missing', undefined],
      ['0', 0],
    ])('is not shown when it is %s', (_description, indexCount) => {
      renderFooter({ status: 'ready', stats: statsWithRate(3700) }, { indexCount });

      expect(isShown('streamsCanvasDestinationIndexCount')).toBe(false);
    });
  });
});
