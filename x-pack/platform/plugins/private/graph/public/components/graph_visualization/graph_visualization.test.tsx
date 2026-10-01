/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { GraphVisualization } from './graph_visualization';
import type { RuntimeGraph, WorkspaceEdge, WorkspaceNode } from '../../types';

describe('graph_visualization', () => {
  const nodes: WorkspaceNode[] = [
    {
      id: '1',
      color: 'black',
      data: {
        field: 'A',
        term: '1',
      },
      icon: {
        id: 'a',
        package: 'eui',
        prevName: '',
        label: '',
      },
      kx: 5,
      ky: 5,
      label: '1',
      numChildren: 1,
      parent: null,
      scaledSize: 10,
      x: 5,
      y: 5,
    },
    {
      id: '2',
      color: 'red',
      data: {
        field: 'B',
        term: '2',
      },
      icon: {
        id: 'b',
        package: 'eui',
        prevName: '',
        label: '',
      },
      kx: 7,
      ky: 9,
      label: '2',
      numChildren: 0,
      parent: null,
      scaledSize: 10,
      x: 7,
      y: 9,
    },
    {
      id: '3',
      color: 'yellow',
      data: {
        field: 'C',
        term: '3',
      },
      icon: {
        id: 'c',
        package: 'eui',
        prevName: '',
        label: '',
      },
      kx: 12,
      ky: 2,
      label: '3',
      numChildren: 0,
      parent: null,
      scaledSize: 10,
      x: 7,
      y: 9,
    },
  ];
  const edges: WorkspaceEdge[] = [
    {
      label: '',
      topSrc: nodes[0],
      topTarget: nodes[1],
      source: nodes[0],
      target: nodes[1],
      weight: 10,
      width: 2,
    },
    {
      label: '',
      topSrc: nodes[1],
      topTarget: nodes[2],
      source: nodes[1],
      target: nodes[2],
      weight: 10,
      width: 2.2,
    },
  ];
  const workspace = {
    nodes,
    edges,
  } as unknown as jest.Mocked<RuntimeGraph>;

  const defaultSelectionProps = {
    selectedNodeIds: ['1'],
    selectedEdgeIds: ['A..1-B..2', 'B..2-C..3'],
    onToggleNodeSelection: jest.fn(() => true),
    onToggleEdgeSelection: jest.fn(() => true),
    getMergeCandidates: jest.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty workspace without data', () => {
    expect(
      shallow(
        <GraphVisualization
          {...defaultSelectionProps}
          workspace={{} as unknown as RuntimeGraph}
          selectSelected={() => {}}
          onSetControl={() => {}}
          onSetMergeCandidates={() => {}}
        />
      )
    ).toMatchInlineSnapshot(`
      <svg
        className="gphGraph"
        height="100%"
        id="graphSvg"
        pointerEvents="all"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <g />
        </g>
      </svg>
    `);
  });

  it('should render to svg elements', () => {
    expect(
      shallow(
        <GraphVisualization
          {...defaultSelectionProps}
          workspace={workspace}
          selectSelected={() => {}}
          onSetControl={() => {}}
          onSetMergeCandidates={() => {}}
        />
      )
    ).toMatchSnapshot();
  });

  it('should react to node selection', () => {
    const selectSelectedMock = jest.fn();

    const instance = shallow(
      <GraphVisualization
        {...defaultSelectionProps}
        workspace={workspace}
        selectSelected={selectSelectedMock}
        onSetControl={() => {}}
        onSetMergeCandidates={() => {}}
      />
    );

    instance.find('.gphNode').last().simulate('click', {});

    expect(defaultSelectionProps.onToggleNodeSelection).toHaveBeenCalledWith(nodes[2], true);
    expect(selectSelectedMock).toHaveBeenCalledWith(nodes[2]);
  });

  it('should react to node deselection', () => {
    const onSetControlMock = jest.fn();
    const instance = shallow(
      <GraphVisualization
        {...defaultSelectionProps}
        onToggleNodeSelection={() => false}
        workspace={workspace}
        selectSelected={() => {}}
        onSetControl={onSetControlMock}
        onSetMergeCandidates={() => {}}
      />
    );

    instance.find('.gphNode').first().simulate('click', {});

    expect(onSetControlMock).toHaveBeenCalledWith('none');
  });

  it('should react to edge click', () => {
    const instance = shallow(
      <GraphVisualization
        {...defaultSelectionProps}
        workspace={workspace}
        selectSelected={() => {}}
        onSetControl={() => {}}
        onSetMergeCandidates={() => {}}
      />
    );

    instance.find('.gphEdge').at(1).simulate('click');

    expect(defaultSelectionProps.getMergeCandidates).toHaveBeenCalledWith([
      edges[0].topSrc,
      edges[0].topTarget,
    ]);
    expect(defaultSelectionProps.onToggleEdgeSelection).toHaveBeenCalledWith(edges[0]);
  });
});
