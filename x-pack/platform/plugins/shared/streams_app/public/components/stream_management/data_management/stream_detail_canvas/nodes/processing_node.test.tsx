/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import type { Unit } from '../../../../../services/unit_repository';
import type { ProcessingNodeData, ProcessingNode as ProcessingNodeType } from '../types';
import { ProcessingNode } from './processing_node';

const mockUseSlotStats = jest.fn();

jest.mock('../../../../unit_stats/state_management/use_stats_manager', () => ({
  useSlotStats: (args: unknown) => mockUseSlotStats(args),
}));

const mockUnit: Unit = {
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

jest.mock('../state_management', () => ({
  useCanvasPersistedUnit: () => mockUnit,
}));

const PIPELINE_NODE_DATA: ProcessingNodeData = {
  ref: { kind: 'pipeline', pipelineId: 'main' },
  title: 'Parse and enrich',
  processorCount: 2,
  editable: true,
};

const ROUTE_NODE_DATA: ProcessingNodeData = {
  ref: { kind: 'route', pipelineId: 'main', routeIndex: 0 },
  title: 'Tag nginx',
  processorCount: 1,
  editable: true,
};

const renderNode = (data: ProcessingNodeData) =>
  render(
    <ReactFlowProvider>
      <ProcessingNode
        {...({ data, selected: false, dragging: false } as NodeProps<ProcessingNodeType>)}
      />
    </ReactFlowProvider>
  );

const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

beforeEach(() => {
  mockUseSlotStats.mockReset();
  mockUseSlotStats.mockReturnValue({
    status: 'ready',
    eventsRate: 3700,
    durationAverage: 0.008,
  });
});

describe('ProcessingNode', () => {
  it('still shows its title and its processor count', () => {
    renderNode(PIPELINE_NODE_DATA);

    expect(screen.getByText('Parse and enrich')).toBeTruthy();
    expect(screen.getByText('2 processors')).toBeTruthy();
  });

  it('shows the stats of a pipeline slot, read from the processors of that slot', () => {
    renderNode(PIPELINE_NODE_DATA);

    expect(mockUseSlotStats).toHaveBeenCalledWith({
      ref: PIPELINE_NODE_DATA.ref,
      processorIds: ['parse', 'enrich'],
    });
    expect(screen.getByTestId('streamsCanvasProcessingNodeRate').textContent).toBe('3.7k eps');
    expect(screen.getByTestId('streamsCanvasProcessingNodeDuration').textContent).toBe('8ms');
  });

  it('shows the stats of a route slot, read from the processors of that route', () => {
    renderNode(ROUTE_NODE_DATA);

    expect(mockUseSlotStats).toHaveBeenCalledWith({
      ref: ROUTE_NODE_DATA.ref,
      processorIds: ['tag-a'],
    });
    expect(isShown('streamsCanvasProcessingNodeStats')).toBe(true);
  });

  it('keeps its stats row, with no numbers, while nothing is known', () => {
    mockUseSlotStats.mockReturnValue({
      status: 'unknown',
      eventsRate: null,
      durationAverage: null,
    });

    renderNode(PIPELINE_NODE_DATA);

    expect(isShown('streamsCanvasProcessingNodeStats')).toBe(true);
    expect(isShown('streamsCanvasProcessingNodeRate')).toBe(false);
    expect(screen.getByText('Parse and enrich')).toBeTruthy();
  });
});
