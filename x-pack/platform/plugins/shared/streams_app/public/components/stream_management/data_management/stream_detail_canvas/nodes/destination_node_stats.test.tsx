/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DestinationStatsView } from '../../../../../services/unit_stats_client/types';
import type { StatsEntry } from '../../../../unit_stats/state_management/types';
import { DestinationNodeStats } from './destination_node_stats';

const mockUseDestinationStats = jest.fn();

jest.mock('../../../../unit_stats/state_management/use_stats_manager', () => ({
  useDestinationStats: (id: string | undefined) => mockUseDestinationStats(id),
}));

const statsWithRate = (eventsRate: number | null): DestinationStatsView => ({
  eventsRate,
  eventsTotal: null,
  failedRate: null,
  latencyAverage: null,
  series: { bucketMs: 300000, points: [] },
});

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
    it('shows Live and the rate', () => {
      renderFooter({ status: 'ready', stats: statsWithRate(3700) });

      expect(text('streamsCanvasDestinationLive')).toBe('Live');
      expect(text('streamsCanvasDestinationRate')).toBe('3.7k eps');
      expect(isShown('streamsCanvasDestinationNotFlowing')).toBe(false);
    });

    it('keeps showing Live while a refresh has failed, and the value is stale', () => {
      renderFooter({ status: 'stale', stats: statsWithRate(3700) });

      expect(text('streamsCanvasDestinationLive')).toBe('Live');
      expect(text('streamsCanvasDestinationRate')).toBe('3.7k eps');
    });
  });

  describe('a destination without data', () => {
    it.each<[string, StatsEntry<DestinationStatsView>]>([
      ['a result with no data', { status: 'noData', stats: statsWithRate(null) }],
      ['a rate of exactly 0', { status: 'ready', stats: statsWithRate(0) }],
    ])('shows Data not flowing in, and no rate, for %s', (_description, entry) => {
      renderFooter(entry);

      expect(text('streamsCanvasDestinationNotFlowing')).toBe('Data not flowing in');
      expect(isShown('streamsCanvasDestinationLive')).toBe(false);
      expect(isShown('streamsCanvasDestinationRate')).toBe(false);
    });
  });

  describe('when nothing is known yet', () => {
    it.each<[string, StatsEntry<DestinationStatsView> | undefined]>([
      ['no entry yet', undefined],
      ['a request in flight', { status: 'loading' }],
      [
        'an error',
        { status: 'error', error: { code: 'unavailable', reason: 'Elasticsearch is unavailable' } },
      ],
    ])('shows no status and no rate for %s, and keeps its row', (_description, entry) => {
      renderFooter(entry);

      expect(isShown('streamsCanvasDestinationStats')).toBe(true);
      expect(isShown('streamsCanvasDestinationLive')).toBe(false);
      expect(isShown('streamsCanvasDestinationNotFlowing')).toBe(false);
      expect(isShown('streamsCanvasDestinationRate')).toBe(false);
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
      ['live', { status: 'ready', stats: statsWithRate(3700) }],
      ['not flowing', { status: 'noData', stats: statsWithRate(null) }],
      ['loading', { status: 'loading' }],
      ['unknown', undefined],
    ])('shows it when the status is %s', (_status, entry) => {
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
