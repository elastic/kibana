/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import classNames from 'classnames';
import React from 'react';
import { WorkspaceNode } from '../../types';
import { getIconOffset, IconRenderer } from '../icon_renderer';

interface SelectedNodeItemProps {
  node: WorkspaceNode;
  isHighlighted: boolean;
  onDeselectNode: (node: WorkspaceNode) => void;
  onSelectedFieldClick: (node: WorkspaceNode) => void;
}

function fixIconOffset(node: WorkspaceNode) {
  const offset = getIconOffset(node.icon) || { x: 0, y: 0 };
  const finalOffset = { x: offset.x / 2, y: offset.y / 2 };
  // Maki icons need to be offset a little bit more on the right (~0.5px)
  if (node.icon?.package === 'maki') {
    finalOffset.x += 0.5;
  }
  return finalOffset;
}

export const SelectedNodeItem = ({
  node,
  isHighlighted,
  onSelectedFieldClick,
  onDeselectNode,
}: SelectedNodeItemProps) => {
  const fieldClasses = classNames('gphSelectionList__field', {
    ['gphSelectionList__field--selected']: isHighlighted,
  });
  const offset = fixIconOffset(node);

  return (
    <button aria-hidden="true" className={fieldClasses} onClick={() => onSelectedFieldClick(node)}>
      <svg width="24" height="24">
        <circle
          className="gphNode__circle"
          r="10"
          cx="12"
          cy="12"
          style={{ fill: node.color }}
          onClick={() => onDeselectNode(node)}
          data-test-subj={`graph-selected-${node.label}`}
        />
        <IconRenderer
          color={node.color}
          icon={node.icon}
          className="gphSelectionList__icon"
          x={offset.x}
          y={offset.y}
        />
      </svg>
      <span>{node.label}</span>
      {node.numChildren > 0 && <span> (+{node.numChildren})</span>}
    </button>
  );
};
