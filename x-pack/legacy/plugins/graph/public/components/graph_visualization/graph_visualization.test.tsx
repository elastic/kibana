/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef } from 'react';
import classNames from 'classnames';
import d3, { ZoomEvent } from 'd3';
import { WorkspaceNode, WorkspaceEdge } from '../../types';
import { makeNodeId } from '../../services/persistence';
import { shallow } from 'enzyme';
import { GraphVisualization } from './graph_visualization';
import { getSuitableIcon } from '../../helpers/style_choices';

describe('graph_visualization', () => {
  it('should render empty workspace without data', () => {
    expect(shallow(<GraphVisualization edgeClick={() => {}} nodeClick={() => {}} />)).toMatchInlineSnapshot();
  });

  it('should render to svg elements', () => {
    expect(shallow(<GraphVisualization edgeClick={() => {}} nodeClick={() => {}} nodes={[
      {
        color: 'black',
        data: {
          field: 'A',
          term: '1'
        },
        icon: getSuitableIcon(''),
        isSelected: true,
         kx: 5,
         ky: 5,
         label: '1',
         numChildren: 1,
         parent: null,
         scaledSize: 10,
         x: 5,
         y: 5
      },
      {
        color: 'red',
        data: {
          field: 'B',
          term: '2'
        },
        icon: getSuitableIcon(''),
        isSelected: false,
         kx: 7,
         ky: 9,
         label: '2',
         numChildren: 0,
         parent: null,
         scaledSize: 10,
         x: 7,
         y: 9
      },
      {
        color: 'blue',
        data: {
          field: 'C',
          term: '3'
        },
        icon: getSuitableIcon(''),
        isSelected: false,
         kx: 12,
         ky: 2,
         label: '3',
         numChildren: 0,
         parent: null,
         scaledSize: 10,
         x: 7,
         y: 9
      }
    ]} edges={[
      {
        inferred: false,
        isSelected: true,
        label: '',
        top
      }
    ]} />)).toMatchInlineSnapshot();
  });
});