/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { keyCodes } from '@elastic/eui';
import { FilterBar } from './filter_bar';


const defaultProps = {
  disabled: false,
  initialValue: '',
  placeholder: 'Test placeholder',
  isLoading: false,
  onChange: () => {},
  onSubmit: () => {},
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

describe('FilterBar', () => {

  test('snapshot suggestions not shown', () => {
    const wrapper = shallow(<FilterBar {...defaultProps}/>);
    expect(wrapper).toMatchSnapshot();
  });

  test('snapshot suggestions shown', () => {
    const wrapper = shallow(<FilterBar {...defaultProps} />);
    wrapper.setState({ isSuggestionsVisible: true });
    expect(wrapper).toMatchSnapshot();
  });

  test('index updated in state when suggestion is navigated to via mouse', () => {
    const wrapper = mount(<FilterBar {...defaultProps} />);
    wrapper.setState({ isSuggestionsVisible: true });

    expect(wrapper.state('index')).toEqual(null);

    const firstSuggestion = wrapper.find('li').first();
    firstSuggestion.simulate('mouseenter');
    expect(wrapper.state('index')).toEqual(0);
  });

  test('index updated and suggestions set to visible when input added', () => {
    const wrapper = shallow(<FilterBar {...defaultProps} />);
    // default values
    expect(wrapper.state('index')).toEqual(null);
    expect(wrapper.state('isSuggestionsVisible')).toBe(false);

    const searchBar = wrapper.find('EuiFieldSearch');
    searchBar.simulate('keydown', { preventDefault: () => {}, keyCode: keyCodes.DOWN });
    wrapper.update();
    // updated values
    expect(wrapper.state('index')).toEqual(0);
    expect(wrapper.state('isSuggestionsVisible')).toBe(true);
  });

  test('index updated in state when suggestion is navigated to via keyboard', () => {
    const wrapper = shallow(<FilterBar {...defaultProps} />);
    wrapper.setState({ isSuggestionsVisible: true, value: 'f', index: 0 });
    const searchBar = wrapper.find('EuiFieldSearch');
    searchBar.simulate('keydown', { preventDefault: () => { }, keyCode: keyCodes.DOWN });
    wrapper.update();

    expect(wrapper.state('index')).toEqual(1);
  });

});
