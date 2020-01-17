/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PipelineViewer } from '../pipeline_viewer';
import { shallow } from 'enzyme';

describe('PipelineViewer component', () => {
  let pipeline;
  let component;

  beforeEach(() => {
    pipeline = {
      inputs: [
        {
          depth: 0,
          id: 'standardInput',
          parentId: null,
        },
      ],
      filters: [
        {
          depth: 0,
          id: 'mutate',
          parentId: null,
        },
      ],
      outputs: [
        {
          depth: 0,
          id: 'elasticsearch',
          parentId: null,
        },
      ],
      queue: {
        id: '__QUEUE__',
        hasExplicitId: false,
        stats: [],
        meta: null,
      },
    };

    component = <PipelineViewer pipeline={pipeline} setDetailVertexId={jest.fn()} />;
  });

  it('passes expected props', () => {
    const renderedComponent = shallow(component);

    expect(renderedComponent).toMatchSnapshot();
  });

  it('renders DetailDrawer when selected vertex is not null', () => {
    const vertex = { id: 'stdin' };
    component = (
      <PipelineViewer pipeline={pipeline} setDetailVertexId={jest.fn()} detailVertex={vertex} />
    );

    const renderedComponent = shallow(component);

    expect(renderedComponent).toMatchSnapshot();
  });
});
