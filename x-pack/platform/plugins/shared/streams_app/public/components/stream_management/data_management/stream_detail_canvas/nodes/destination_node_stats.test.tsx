/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DestinationStatsView } from '../../../../../services/unit_stats_client/types';
import type { StatsEntry } from '../../../../unit_stats/state_management/types';
import { DestinationNodeStats } from './destination_node_stats';

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
  failedRate: null,
  latencyAverage,
  series: { bucketMs: 300000, points: [] },
});

const statsWithRate = (eventsRate: number | null): DestinationStatsView =>
  statsWith({ eventsRate });

const renderFooter = (
  entry: StatsEntry<DestinationStatsView> | undefined,
  props: { indexCount?: number } = {}
) => {
  mockUseDestinationStats.mockReturnValue(entry);
  return render(<DestinationNodeStats destinationId="es-prod" {...props} />);
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

  describe('a destination with missing values', () => {
    it.each<[string, StatsEntry<DestinationStatsView>, string, string]>([
      ['no data at all', { status: 'noData', stats: statsWith({}) }, '-', '-'],
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
