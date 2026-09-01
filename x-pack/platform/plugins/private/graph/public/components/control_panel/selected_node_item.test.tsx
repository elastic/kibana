/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, fireEvent } from '@testing-library/react';
import type { WorkspaceNode } from '../../types';
import { SelectedNodeItem } from './selected_node_item';

const buildNode = (overrides: Partial<WorkspaceNode> = {}): WorkspaceNode => ({
  id: '1',
  x: 0,
  y: 0,
  label: 'test-node',
  icon: { id: 'empty', package: 'eui', prevName: '', label: '' },
  data: { field: 'A', term: '1' },
  scaledSize: 10,
  parent: null,
  color: '#000000',
  numChildren: 0,
  kx: 0,
  ky: 0,
  ...overrides,
});

const renderItem = (props: Partial<Parameters<typeof SelectedNodeItem>[0]> = {}) => {
  const onSelectedFieldClick = jest.fn();
  const onDeselectNode = jest.fn();
  const node = props.node ?? buildNode();
  const result = render(
    <EuiProvider>
      <SelectedNodeItem
        node={node}
        isHighlighted={false}
        onSelectedFieldClick={onSelectedFieldClick}
        onDeselectNode={onDeselectNode}
        {...props}
      />
    </EuiProvider>
  );
  return { ...result, onSelectedFieldClick, onDeselectNode, node };
};

describe('SelectedNodeItem', () => {
  it('exposes the row and deselect-circle test subjects derived from the node label', () => {
    const { getByTestId } = renderItem({ node: buildNode({ label: '/test/wp-admin/' }) });

    // The Scout page object's `isolateEdge` flow snapshots labels from the
    // row test subject and clicks the matching `graph-selected-<label>`
    // circle — keep both in sync with the production component.
    expect(getByTestId('graphSelectionListField-/test/wp-admin/')).toBeInTheDocument();
    expect(getByTestId('graph-selected-/test/wp-admin/')).toBeInTheDocument();
  });

  it('fires onSelectedFieldClick when the row is clicked', () => {
    const { getByTestId, onSelectedFieldClick, onDeselectNode, node } = renderItem();

    fireEvent.click(getByTestId(`graphSelectionListField-${node.label}`));

    expect(onSelectedFieldClick).toHaveBeenCalledTimes(1);
    expect(onSelectedFieldClick).toHaveBeenCalledWith(node);
    expect(onDeselectNode).not.toHaveBeenCalled();
  });

  it('fires onDeselectNode when the colored circle is clicked', () => {
    const { getByTestId, onSelectedFieldClick, onDeselectNode, node } = renderItem();

    fireEvent.click(getByTestId(`graph-selected-${node.label}`));

    expect(onDeselectNode).toHaveBeenCalledTimes(1);
    expect(onDeselectNode).toHaveBeenCalledWith(node);
    // The circle's click bubbles to the parent button. We document the
    // current behavior: `onSelectedFieldClick` also fires, which is benign
    // because `onDeselectNode` removes the node from the workspace.
    expect(onSelectedFieldClick).toHaveBeenCalledTimes(1);
  });
});
