/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ProcessingNodeRef } from '../../../../../services/unit_graph';
import type { Unit } from '../../../../../services/unit_repository';
import type { SlotStats } from '../../../../unit_stats/state_management/get_slot_stats';
import { ProcessingNodeStats } from './processing_node_stats';

const mockUseSlotStats = jest.fn();
const mockUnit: { current: Unit } = { current: undefined as unknown as Unit };

jest.mock('../../../../unit_stats/state_management/use_stats_manager', () => ({
  useSlotStats: (args: unknown) => mockUseSlotStats(args),
}));

jest.mock('../state_management', () => ({
  useCanvasPersistedUnit: () => mockUnit.current,
}));

const UNIT: Unit = {
  unit: {
    sources: [],
    destinations: [],
    pipelines: [
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'processors', value: ['parse', 'enrich'] },
          { name: 'routes', value: [{ when: 'a', processors: ['tag-a'], destinations: ['out'] }] },
        ],
      },
    ],
  },
  ui_metadata: {},
};

const PIPELINE_SLOT: ProcessingNodeRef = { kind: 'pipeline', pipelineId: 'main' };
const ROUTE_SLOT: ProcessingNodeRef = { kind: 'route', pipelineId: 'main', routeIndex: 0 };

const renderRow = (slot: ProcessingNodeRef, stats: SlotStats) => {
  mockUseSlotStats.mockReturnValue(stats);
  return render(<ProcessingNodeStats slot={slot} />);
};

const text = (testId: string) => screen.getByTestId(testId).textContent;
const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

beforeEach(() => {
  mockUseSlotStats.mockReset();
  mockUnit.current = UNIT;
});

describe('ProcessingNodeStats', () => {
  describe('what it asks the stats for', () => {
    const UNKNOWN: SlotStats = { status: 'unknown', eventsRate: null, durationAverage: null };

    it('passes the processors of a pipeline slot, in order', () => {
      renderRow(PIPELINE_SLOT, UNKNOWN);

      expect(mockUseSlotStats).toHaveBeenCalledWith({
        ref: PIPELINE_SLOT,
        processorIds: ['parse', 'enrich'],
      });
    });

    it('passes the processors of a route slot', () => {
      renderRow(ROUTE_SLOT, UNKNOWN);

      expect(mockUseSlotStats).toHaveBeenCalledWith({ ref: ROUTE_SLOT, processorIds: ['tag-a'] });
    });

    it('passes no processors for a slot that is not in the saved unit', () => {
      renderRow({ kind: 'pipeline', pipelineId: 'missing' }, UNKNOWN);

      expect(mockUseSlotStats).toHaveBeenCalledWith({
        ref: { kind: 'pipeline', pipelineId: 'missing' },
        processorIds: [],
      });
    });
  });

  describe('what it shows', () => {
    it('shows the rate and the time once the numbers are known', () => {
      renderRow(ROUTE_SLOT, { status: 'ready', eventsRate: 3700, durationAverage: 0.008 });

      expect(text('streamsCanvasProcessingNodeRate')).toBe('3.7k eps');
      expect(text('streamsCanvasProcessingNodeDuration')).toBe('8ms');
    });

    it('shows a dash for a number that is missing, and never a zero', () => {
      renderRow(ROUTE_SLOT, { status: 'ready', eventsRate: null, durationAverage: null });

      expect(text('streamsCanvasProcessingNodeRate')).toBe('-');
      expect(text('streamsCanvasProcessingNodeDuration')).toBe('-');
    });

    it('shows a rate without a time when only the time is missing', () => {
      renderRow(ROUTE_SLOT, { status: 'ready', eventsRate: 3700, durationAverage: null });

      expect(text('streamsCanvasProcessingNodeRate')).toBe('3.7k eps');
      expect(text('streamsCanvasProcessingNodeDuration')).toBe('-');
    });

    it('keeps its row and shows no numbers while nothing is known', () => {
      renderRow(ROUTE_SLOT, { status: 'unknown', eventsRate: null, durationAverage: null });

      expect(isShown('streamsCanvasProcessingNodeStats')).toBe(true);
      expect(isShown('streamsCanvasProcessingNodeRate')).toBe(false);
      expect(isShown('streamsCanvasProcessingNodeDuration')).toBe(false);
    });
  });
});
