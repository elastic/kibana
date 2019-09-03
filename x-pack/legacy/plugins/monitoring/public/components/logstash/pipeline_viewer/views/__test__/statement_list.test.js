/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatementList } from '../statement_list';
import { Statement } from '../statement';
import { shallow } from 'enzyme';

describe('StatementList', () => {
  let props;
  let onShowVertexDetails;

  beforeEach(() => {
    onShowVertexDetails = jest.fn();
    props = {
      elements: [
        {
          id: 'mutateIf',
          parentId: null,
          depth: 0,
          statement: { },
        },
        {
          id: 'mutate',
          parentId: 'mutateIf',
          depth: 1,
          statement: { },
        },
      ],
      onShowVertexDetails,
    };
  });

  const render = props => shallow(<StatementList {...props} />);

  it('renders nested elements as expected', () => {
    const wrapper = render(props);
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.find(Statement).length).toBe(2);
  });

  it('renders children elements when parent is collapsed', () => {
    const wrapper = render(props);
    const instance = wrapper.instance();
    instance.collapse('mutateIf');
    wrapper.update();

    expect(wrapper.find(Statement).length).toBe(1);
  });

  it('renders children after expanding collapsed elements', () => {
    const wrapper = render(props);
    const instance = wrapper.instance();

    instance.collapse('mutateIf');
    wrapper.update();
    expect(wrapper.find(Statement).length).toBe(1);

    instance.expand('mutateIf');
    wrapper.update();
    expect(wrapper.find(Statement).length).toBe(2);
  });
});
