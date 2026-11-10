/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import type { SourceNodeData, SourceNode as SourceNodeType } from '../types';
import { SourceNode } from './source_node';

const mockUseSourceStats = jest.fn();

jest.mock('../../../../unit_stats/state_management/use_stats_manager', () => ({
  useSourceStats: (id: string | undefined) => mockUseSourceStats(id),
}));

const OTLP_NODE_DATA: SourceNodeData = {
  title: 'otlp-input',
  subtitle: 'OTLP',
  sourceId: 'otlp-input',
  sourceType: 'otlp',
  signals: ['logs'],
};

const renderNode = (data: SourceNodeData) =>
  render(
    <ReactFlowProvider>
      <SourceNode {...({ data, selected: false, dragging: false } as NodeProps<SourceNodeType>)} />
    </ReactFlowProvider>
  );

const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

beforeEach(() => {
  mockUseSourceStats.mockReset();
  mockUseSourceStats.mockReturnValue(undefined);
});

describe('SourceNode', () => {
  it('shows the stats footer of a source that reports metrics, with its stats', () => {
    mockUseSourceStats.mockReturnValue({ status: 'ready', stats: { acceptedRate: 3700 } });

    renderNode(OTLP_NODE_DATA);

    expect(mockUseSourceStats).toHaveBeenCalledWith('otlp-input');
    expect(isShown('streamsCanvasSourceStats')).toBe(true);
    expect(screen.getByTestId('streamsCanvasSourceLive').textContent).toBe('Live');
    expect(screen.getByTestId('streamsCanvasSourceRate').textContent).toBe('3.7k/s');
  });

  it('shows Waiting for data... for a source with no data', () => {
    mockUseSourceStats.mockReturnValue({ status: 'noData', stats: { acceptedRate: null } });

    renderNode(OTLP_NODE_DATA);

    expect(screen.getByTestId('streamsCanvasSourceWaiting').textContent).toBe(
      'Waiting for data...'
    );
  });

  it('still shows the title, the signals and the subtitle', () => {
    renderNode(OTLP_NODE_DATA);

    expect(screen.getByText('otlp-input')).toBeTruthy();
    expect(screen.getByText('OTLP')).toBeTruthy();
    expect(isShown('streamsCanvasSourceSignalBadge')).toBe(true);
  });

  describe('which sources show a footer', () => {
    it.each<[SourceNodeData['sourceType']]>([
      ['otlp'],
      ['async_bulk'],
      ['prometheus_remote_write'],
    ])('shows it for a %s source, which the ingest collector serves', (sourceType) => {
      renderNode({ ...OTLP_NODE_DATA, sourceType });

      expect(isShown('streamsCanvasSourceStats')).toBe(true);
      expect(mockUseSourceStats).toHaveBeenCalledWith('otlp-input');
    });

    it.each<[SourceNodeData['sourceType']]>([
      ['bulk'],
      ['es_otlp'],
      ['es_prometheus_remote_write'],
    ])('shows none for a %s source, and never reads its stats', (sourceType) => {
      renderNode({ ...OTLP_NODE_DATA, sourceType });

      expect(isShown('streamsCanvasSourceStats')).toBe(false);
      expect(mockUseSourceStats).not.toHaveBeenCalled();
    });

    it('shows none for a node without a source type', () => {
      renderNode({ ...OTLP_NODE_DATA, sourceType: undefined });

      expect(isShown('streamsCanvasSourceStats')).toBe(false);
      expect(mockUseSourceStats).not.toHaveBeenCalled();
    });

    it('shows none for a node without a source id, such as one still to be configured', () => {
      renderNode({ ...OTLP_NODE_DATA, sourceId: undefined });

      expect(isShown('streamsCanvasSourceStats')).toBe(false);
      expect(mockUseSourceStats).not.toHaveBeenCalled();
    });
  });
});
