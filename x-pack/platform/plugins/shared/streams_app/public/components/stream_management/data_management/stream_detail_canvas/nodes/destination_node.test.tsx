/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import type { DestinationNodeData, DestinationNode as DestinationNodeType } from '../types';
import { DestinationNode } from './destination_node';

const mockUseDestinationStats = jest.fn();

jest.mock('../../../../unit_stats/state_management/use_stats_manager', () => ({
  useDestinationStats: (id: string | undefined) => mockUseDestinationStats(id),
}));

const ELASTICSEARCH_NODE_DATA: DestinationNodeData = {
  title: 'logs-stuff',
  subtitle: 'Auto',
  destinationId: 'es-prod',
  destinationType: 'elasticsearch',
  signals: ['logs'],
  indexCount: 3,
};

const renderNode = (data: DestinationNodeData) =>
  render(
    <ReactFlowProvider>
      <DestinationNode
        {...({ data, selected: false, dragging: false } as NodeProps<DestinationNodeType>)}
      />
    </ReactFlowProvider>
  );

const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

beforeEach(() => {
  mockUseDestinationStats.mockReset();
  mockUseDestinationStats.mockReturnValue(undefined);
});

describe('DestinationNode', () => {
  it('shows the stats footer of an Elasticsearch destination, with its stats', () => {
    mockUseDestinationStats.mockReturnValue({
      status: 'ready',
      stats: {
        eventsRate: 3700,
        eventsTotal: null,
        failedRate: null,
        latencyAverage: null,
        series: { bucketMs: 300000, points: [] },
      },
    });

    renderNode(ELASTICSEARCH_NODE_DATA);

    expect(mockUseDestinationStats).toHaveBeenCalledWith('es-prod');
    expect(isShown('streamsCanvasDestinationStats')).toBe(true);
    expect(screen.getByTestId('streamsCanvasDestinationRate').textContent).toBe('3.7k eps');
    expect(screen.getByTestId('streamsCanvasDestinationIndexCount').textContent).toBe('3 indices');
  });

  it('still shows the title, the signals and the subtitle', () => {
    renderNode(ELASTICSEARCH_NODE_DATA);

    expect(screen.getByText('logs-stuff')).toBeTruthy();
    expect(screen.getByText('Auto')).toBeTruthy();
    expect(isShown('streamsCanvasDestinationSignalBadge')).toBe(true);
  });

  it('no longer shows the index count as a badge next to the title', () => {
    renderNode(ELASTICSEARCH_NODE_DATA);

    expect(isShown('streamsCanvasDestinationIndexCountBadge')).toBe(false);
  });

  describe('a destination that reports no stats', () => {
    it('shows no footer for an S3 destination, and never reads its stats', () => {
      renderNode({
        title: 'archive',
        subtitle: 'my-archive',
        destinationId: 'archive',
        destinationType: 's3',
        signals: ['logs'],
      });

      expect(isShown('streamsCanvasDestinationStats')).toBe(false);
      expect(mockUseDestinationStats).not.toHaveBeenCalled();
    });

    it('shows no footer for a node without a destination type', () => {
      renderNode({ ...ELASTICSEARCH_NODE_DATA, destinationType: undefined });

      expect(isShown('streamsCanvasDestinationStats')).toBe(false);
      expect(mockUseDestinationStats).not.toHaveBeenCalled();
    });

    it('shows no footer for a node without a destination id', () => {
      renderNode({ ...ELASTICSEARCH_NODE_DATA, destinationId: undefined });

      expect(isShown('streamsCanvasDestinationStats')).toBe(false);
      expect(mockUseDestinationStats).not.toHaveBeenCalled();
    });
  });
});
