/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import {
  GraphVisualization,
  GroupAwareWorkspaceNode,
  GroupAwareWorkspaceEdge,
} from './graph_visualization';

describe('graph_visualization', () => {
  const nodes: GroupAwareWorkspaceNode[] = [
    {
      color: 'black',
      data: {
        field: 'A',
        term: '1',
      },
      icon: {
        class: 'a',
        code: 'a',
        label: '',
      },
      isSelected: true,
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
      color: 'red',
      data: {
        field: 'B',
        term: '2',
      },
      icon: {
        class: 'b',
        code: 'b',
        label: '',
      },
      isSelected: false,
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
      color: 'yellow',
      data: {
        field: 'C',
        term: '3',
      },
      icon: {
        class: 'c',
        code: 'c',
        label: '',
      },
      isSelected: false,
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
  const edges: GroupAwareWorkspaceEdge[] = [
    {
      isSelected: true,
      label: '',
      topSrc: nodes[0],
      topTarget: nodes[1],
      source: nodes[0],
      target: nodes[1],
      weight: 10,
      width: 2,
    },
    {
      isSelected: true,
      label: '',
      topSrc: nodes[1],
      topTarget: nodes[2],
      source: nodes[1],
      target: nodes[2],
      weight: 10,
      width: 2.2,
    },
  ];
  it('should render empty workspace without data', () => {
    expect(shallow(<GraphVisualization edgeClick={() => {}} nodeClick={() => {}} />))
      .toMatchInlineSnapshot(`
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
        <GraphVisualization edgeClick={() => {}} nodeClick={() => {}} nodes={nodes} edges={edges} />
      )
    ).toMatchSnapshot();
  });

  it('should react to node click', () => {
    const nodeClickSpy = jest.fn();
    const instance = shallow(
      <GraphVisualization
        edgeClick={() => {}}
        nodeClick={nodeClickSpy}
        nodes={nodes}
        edges={edges}
      />
    );
    instance
      .find('.gphNode')
      .first()
      .simulate('click', {});
    expect(nodeClickSpy).toHaveBeenCalledWith(nodes[0], {});
  });

  it('should react to edge click', () => {
    const edgeClickSpy = jest.fn();
    const instance = shallow(
      <GraphVisualization
        edgeClick={edgeClickSpy}
        nodeClick={() => {}}
        nodes={nodes}
        edges={edges}
      />
    );
    instance
      .find('.gphEdge')
      .first()
      .simulate('click');
    expect(edgeClickSpy).toHaveBeenCalledWith(edges[0]);
  });
});
