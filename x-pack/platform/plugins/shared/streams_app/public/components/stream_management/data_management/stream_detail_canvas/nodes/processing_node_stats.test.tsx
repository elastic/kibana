/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ProcessingNodeRef } from '../../../../../services/unit_graph';
import type { Unit } from '../../../../../services/unit_repository';
import type { SlotStats } from '../../../../unit_stats/state_management/get_slot_stats';
import { ProcessingNodeStats } from './processing_node_stats';

const mockUseSlotStats = jest.fn();
const mockUnit: { current: Unit } = { current: undefined as unknown as Unit };
const mockStagedUnit: { current: Unit } = { current: undefined as unknown as Unit };

jest.mock('../../../../unit_stats/state_management/use_stats_manager', () => ({
  useSlotStats: (args: unknown) => mockUseSlotStats(args),
}));

jest.mock('../state_management', () => ({
  useCanvasPersistedUnit: () => mockUnit.current,
  useCanvasUnitDefinition: () => mockStagedUnit.current,
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
  mockStagedUnit.current = UNIT;
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

    it('passes no processors for a route that unsaved edits moved to another position', () => {
      // Another route was removed ahead of this one, so it sits at position 0 and the saved unit
      // has a different route there.
      mockUnit.current = {
        ...UNIT,
        unit: {
          ...UNIT.unit,
          pipelines: [
            {
              id: 'main',
              supported_telemetry: ['logs'],
              config: [
                {
                  name: 'routes',
                  value: [
                    { when: 'prod', processors: ['tag-prod'], destinations: ['out-prod'] },
                    { when: 'dev', processors: ['tag-dev'], destinations: ['out-dev'] },
                  ],
                },
              ],
            },
          ],
        },
      };
      mockStagedUnit.current = {
        ...mockUnit.current,
        unit: {
          ...mockUnit.current.unit,
          pipelines: [
            {
              id: 'main',
              supported_telemetry: ['logs'],
              config: [
                {
                  name: 'routes',
                  value: [{ when: 'dev', processors: ['tag-dev'], destinations: ['out-dev'] }],
                },
              ],
            },
          ],
        },
      };

      renderRow(ROUTE_SLOT, UNKNOWN);

      expect(mockUseSlotStats).toHaveBeenCalledWith({ ref: ROUTE_SLOT, processorIds: [] });
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

    it('shows the last numbers with a stale mark when a refresh has failed', () => {
      renderRow(ROUTE_SLOT, { status: 'stale', eventsRate: 3700, durationAverage: 0.008 });

      expect(text('streamsCanvasProcessingNodeRate')).toBe('3.7k eps');
      expect(text('streamsCanvasProcessingNodeDuration')).toBe('8ms');
      expect(isShown('streamsCanvasProcessingNodeStale')).toBe(true);
    });

    it('shows no stale mark for numbers that are current', () => {
      renderRow(ROUTE_SLOT, { status: 'ready', eventsRate: 3700, durationAverage: 0.008 });

      expect(isShown('streamsCanvasProcessingNodeStale')).toBe(false);
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

    it('marks the node with a warning, and shows no numbers, when the stats could not be loaded', () => {
      renderRow(ROUTE_SLOT, {
        status: 'error',
        eventsRate: null,
        durationAverage: null,
        errorReason: 'Elasticsearch is unavailable',
      });

      expect(isShown('streamsCanvasProcessingNodeStats')).toBe(true);
      expect(isShown('streamsCanvasProcessingNodeError')).toBe(true);
      expect(isShown('streamsCanvasProcessingNodeRate')).toBe(false);
      expect(isShown('streamsCanvasProcessingNodeDuration')).toBe(false);
    });

    it('explains why in the tooltip of the warning', async () => {
      renderRow(ROUTE_SLOT, {
        status: 'error',
        eventsRate: null,
        durationAverage: null,
        errorReason: 'Elasticsearch is unavailable',
      });

      fireEvent.mouseOver(screen.getByTestId('streamsCanvasProcessingNodeError'));

      expect(await screen.findByText(/Could not load stats\./)).toBeTruthy();
      expect(await screen.findByText(/Elasticsearch is unavailable/)).toBeTruthy();
    });

    it('keeps its row and shows no numbers while nothing is known', () => {
      renderRow(ROUTE_SLOT, { status: 'unknown', eventsRate: null, durationAverage: null });

      expect(isShown('streamsCanvasProcessingNodeStats')).toBe(true);
      expect(isShown('streamsCanvasProcessingNodeRate')).toBe(false);
      expect(isShown('streamsCanvasProcessingNodeDuration')).toBe(false);
    });
  });
});
