/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ScratchpadNode } from '../hooks/use_scratchpad_state';

export interface ScratchpadToolbarProps {
  onAddNode: (type: ScratchpadNode['type']) => void;
  onClearAll?: () => void;
  onLayout?: () => void;
}

/**
 * Helper function to calculate a good position for a new node
 * Positions nodes in a grid-like pattern
 */
export function getNextNodePosition(nodes: ScratchpadNode[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 250, y: 250 };
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

export function ScratchpadToolbar({ onAddNode, onClearAll, onLayout }: ScratchpadToolbarProps) {
  const handleAddNode = (type: ScratchpadNode['type']) => {
    onAddNode(type);
  };

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          iconType="document"
          onClick={() => handleAddNode('text_note')}
        >
          Add Note
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          iconType="search"
          onClick={() => handleAddNode('esql_query')}
        >
          Add ESQL Query
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          iconType="link"
          onClick={() => handleAddNode('kibana_link')}
        >
          Add Link
        </EuiButton>
      </EuiFlexItem>
      {onLayout && (
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="grid"
            onClick={onLayout}
          >
            Arrange Layout
          </EuiButton>
        </EuiFlexItem>
      )}
      {onClearAll && (
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="trash"
            color="danger"
            onClick={onClearAll}
          >
            Clear All
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

