/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { JsonTooltip } from './json_tooltip';
import { getTooltips } from './tooltips';

describe('JsonTooltip', () => {
  let tooltips;
  beforeAll(() => {
    tooltips = getTooltips();
  });

  test(`Plain initialization doesn't throw an error`, () => {
    const wrapper = shallow(<JsonTooltip />);
    expect(wrapper).toMatchSnapshot();
  });

  test(`Initialization with a non-existing tooltip attribute doesn't throw an error`, () => {
    const id = 'non_existing_attribute';
    const wrapper = shallow(<JsonTooltip id={id} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('Initialize with existing tooltip attribute', () => {
    const id = 'new_job_id';
    const wrapper = shallow(<JsonTooltip id={id} />);

    // test the rendered span element which should be referenced by aria-describedby
    const span = wrapper.find('span.ml-info-tooltip-text');
    expect(span.props().id).toBe(`ml_aria_description_${id}`);
    expect(span.text()).toBe(tooltips[id].text);
    expect(wrapper).toMatchSnapshot();
  });
});
