/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiSuperDatePicker } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { ScratchpadNode } from '../hooks/use_scratchpad_state';
import type { Edge } from '@xyflow/react';

export interface ScratchpadToolbarProps {
  onAddNode: (type: ScratchpadNode['type']) => void;
  onClearAll?: () => void;
  onLayout?: () => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
}

/**
 * Helper function to calculate a good position for a new node
 * Positions nodes in a grid-like pattern, or near a selected node if provided
 */
export function getNextNodePosition(
  nodes: ScratchpadNode[],
  selectedNode?: ScratchpadNode | null,
  edges?: Edge[]
): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 250, y: 250 };
  }

  // If a node is selected, position the new node near it
  if (selectedNode) {
    // Default node dimensions (approximate)
    const nodeWidth = 400; // Average width of nodes
    const nodeHeight = 200; // Average height of nodes
    const spacing = 400; // Spacing between node centers

    // Count how many nodes are already connected to the selected node
    // This helps us position new nodes in a radial pattern
    const connectedNodes = nodes.filter(
      (n) =>
        n.id !== selectedNode.id &&
        edges &&
        (edges.some((e) => e.source === selectedNode.id && e.target === n.id) ||
          edges.some((e) => e.source === n.id && e.target === selectedNode.id))
    );

    // Position new node in a radial pattern around the selected node
    // Start at 0 degrees (right), then rotate by 45 degrees for each connected node
    const angle = (connectedNodes.length * 45) % 360; // Rotate around selected node
    const radians = (angle * Math.PI) / 180;

    // Calculate position relative to selected node's center
    return {
      x: selectedNode.position.x + Math.cos(radians) * spacing,
      y: selectedNode.position.y + Math.sin(radians) * spacing,
    };
  }

  // Simple grid layout: 3 columns, spacing of 300px
  const cols = 3;
  const spacing = 300;
  const row = Math.floor(nodes.length / cols);
  const col = nodes.length % cols;

  return {
    x: 250 + col * spacing,
    y: 250 + row * spacing,
  };
}

export function ScratchpadToolbar({
  onAddNode,
  onClearAll,
  onLayout,
  timeRange,
  onTimeRangeChange,
}: ScratchpadToolbarProps) {
  const { uiSettings } = useKibana().services;

  const handleAddNode = (type: ScratchpadNode['type']) => {
    onAddNode(type);
  };

  const handleTimeChange = ({ start, end }: { start: string; end: string }) => {
    if (onTimeRangeChange) {
      onTimeRangeChange({ from: start, to: end });
    }
  };

  const commonlyUsedRanges = uiSettings
    ?.get('timepicker:quickRanges')
    ?.map(({ from, to, display }: { from: string; to: string; display: string }) => ({
      start: from,
      end: to,
      label: display,
    })) || [];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton size="s" iconType="document" onClick={() => handleAddNode('text_note')}>
          Add Note
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" iconType="search" onClick={() => handleAddNode('esql_query')}>
          Add ESQL Query
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" iconType="link" onClick={() => handleAddNode('kibana_link')}>
          Add Link
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" iconType="bell" onClick={() => handleAddNode('alert')}>
          Add Alert
        </EuiButton>
      </EuiFlexItem>
      {onLayout && (
        <EuiFlexItem grow={false}>
          <EuiButton size="s" iconType="grid" onClick={onLayout}>
            Arrange Layout
          </EuiButton>
        </EuiFlexItem>
      )}
      {onClearAll && (
        <EuiFlexItem grow={false}>
          <EuiButton size="s" iconType="trash" color="danger" onClick={onClearAll}>
            Clear All
          </EuiButton>
        </EuiFlexItem>
      )}
      {timeRange && onTimeRangeChange && (
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={timeRange.from}
            end={timeRange.to}
            onTimeChange={handleTimeChange}
            commonlyUsedRanges={commonlyUsedRanges}
            showUpdateButton={false}
            width="auto"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

