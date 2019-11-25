/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { Suggestions } from './suggestions';

const defaultProps = {
  index: 0,
  onClick: () => {},
  onMouseEnter: () => {},
  show: true,
  suggestions: [{
    description: '<p>Test description for fieldValueOne</p>',
    end: 1,
    start: 0,
    text: 'fieldValueOne',
    type: 'field'
  },
  {
    description: '<p>Test description for fieldValueTwo</p>',
    end: 1,
    start: 0,
    text: 'fieldValueTwo',
    type: 'field'
  }]
};

describe('Suggestions', () => {

  test('snapshot', () => {
    const wrapper = shallow(<Suggestions {...defaultProps}/>);
    expect(wrapper).toMatchSnapshot();
  });

  test('is null when show is false', () => {
    const noShowProps = { ...defaultProps, show: false };
    const wrapper = shallow(<Suggestions {...noShowProps} />);
    expect(wrapper.isEmptyRender()).toBeTruthy();
  });

  test('is null when no suggestions are available', () => {
    const noSuggestions = { ...defaultProps, suggestions: [] };
    const wrapper = shallow(<Suggestions {...noSuggestions} />);
    expect(wrapper.isEmptyRender()).toBeTruthy();
  });

  test('creates suggestion list item for each suggestion passed in via props', () => {
    const wrapper = mount(<Suggestions {...defaultProps} />);
    const suggestions = wrapper.find('li');
    expect(suggestions.length).toEqual(2);
  });

});
