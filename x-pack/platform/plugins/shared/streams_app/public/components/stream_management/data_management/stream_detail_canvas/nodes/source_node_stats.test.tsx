/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SourceStatsView } from '../../../../../services/unit_stats_client/types';
import type { StatsEntry } from '../../../../unit_stats/state_management/types';
import { SourceNodeStats } from './source_node_stats';

const mockUseSourceStats = jest.fn();

jest.mock('../../../../unit_stats/state_management/use_stats_manager', () => ({
  useSourceStats: (id: string | undefined) => mockUseSourceStats(id),
}));

const statsWithRate = (acceptedRate: number | null): SourceStatsView => ({ acceptedRate });

const renderFooter = (entry: StatsEntry<SourceStatsView> | undefined) => {
  mockUseSourceStats.mockReturnValue(entry);
  return render(<SourceNodeStats sourceId="otlp-input" />);
};

const text = (testId: string) => screen.getByTestId(testId).textContent;
const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

beforeEach(() => {
  mockUseSourceStats.mockReset();
});

describe('SourceNodeStats', () => {
  it('reads the stats of its source', () => {
    renderFooter(undefined);

    expect(mockUseSourceStats).toHaveBeenCalledWith('otlp-input');
  });

  describe('a source that accepts items', () => {
    it('shows Live and the rate', () => {
      renderFooter({ status: 'ready', stats: statsWithRate(3700) });

      expect(text('streamsCanvasSourceLive')).toBe('Live');
      expect(text('streamsCanvasSourceRate')).toBe('3.7k/s');
      expect(isShown('streamsCanvasSourceWaiting')).toBe(false);
    });

    it('keeps showing Live while a refresh has failed, and marks the value as stale', () => {
      renderFooter({ status: 'stale', stats: statsWithRate(3700) });

      expect(text('streamsCanvasSourceLive')).toBe('Live');
      expect(text('streamsCanvasSourceRate')).toBe('3.7k/s');
      expect(isShown('streamsCanvasSourceStale')).toBe(true);
    });

    it('shows no stale mark for a value that is current', () => {
      renderFooter({ status: 'ready', stats: statsWithRate(3700) });

      expect(isShown('streamsCanvasSourceStale')).toBe(false);
    });
  });

  describe('a source that has not accepted items', () => {
    it.each<[string, StatsEntry<SourceStatsView>]>([
      ['a result with no data', { status: 'noData', stats: statsWithRate(null) }],
      ['an accepted rate of exactly 0', { status: 'ready', stats: statsWithRate(0) }],
    ])('shows Waiting for data..., and no rate, for %s', (_description, entry) => {
      renderFooter(entry);

      expect(text('streamsCanvasSourceWaiting')).toBe('Waiting for data...');
      expect(isShown('streamsCanvasSourceLive')).toBe(false);
      expect(isShown('streamsCanvasSourceRate')).toBe(false);
    });
  });

  describe('when nothing is known yet', () => {
    it.each<[string, StatsEntry<SourceStatsView> | undefined]>([
      ['no entry yet', undefined],
      ['a request in flight', { status: 'loading' }],
    ])('shows no status and no rate for %s, and keeps its row', (_description, entry) => {
      renderFooter(entry);

      expect(isShown('streamsCanvasSourceStats')).toBe(true);
      expect(isShown('streamsCanvasSourceLive')).toBe(false);
      expect(isShown('streamsCanvasSourceWaiting')).toBe(false);
      expect(isShown('streamsCanvasSourceRate')).toBe(false);
      expect(isShown('streamsCanvasSourceError')).toBe(false);
    });
  });

  describe('when the stats could not be loaded', () => {
    const FAILED: StatsEntry<SourceStatsView> = {
      status: 'error',
      error: { code: 'unavailable', reason: 'Elasticsearch is unavailable' },
    };

    it('marks the node with a warning, and shows no status and no rate', () => {
      renderFooter(FAILED);

      expect(isShown('streamsCanvasSourceStats')).toBe(true);
      expect(isShown('streamsCanvasSourceError')).toBe(true);
      expect(isShown('streamsCanvasSourceLive')).toBe(false);
      expect(isShown('streamsCanvasSourceWaiting')).toBe(false);
      expect(isShown('streamsCanvasSourceRate')).toBe(false);
    });

    it('explains why in the tooltip of the warning', async () => {
      renderFooter(FAILED);

      fireEvent.mouseOver(screen.getByTestId('streamsCanvasSourceError'));

      expect(await screen.findByText(/Could not load stats\./)).toBeTruthy();
      expect(await screen.findByText(/Elasticsearch is unavailable/)).toBeTruthy();
    });
  });
});
