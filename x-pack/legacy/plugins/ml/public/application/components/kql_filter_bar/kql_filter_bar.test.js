/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { KqlFilterBar } from './kql_filter_bar';

const defaultProps = {
  indexPattern: {
    title: '.ml-anomalies-*',
    fields: [
      {
        name: 'nginx.access.geoip.country_iso_code',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'nginx.access.url',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
  initialValue: '',
  onSubmit: () => {},
  placeholder: undefined,
};

jest.mock('../../util/dependency_cache', () => ({
  getAutocomplete: () => ({
    getQuerySuggestions: () => {},
  }),
}));

describe('KqlFilterBar', () => {
  test('snapshot', () => {
    const wrapper = shallow(<KqlFilterBar {...defaultProps} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('error message callout when error is present', () => {
    const wrapper = shallow(<KqlFilterBar {...defaultProps} />);
    wrapper.setState({ error: 'Invalid syntax' });
    wrapper.update();
    const callout = wrapper.find('EuiCallOut');

    expect(callout.contains('Invalid syntax')).toBe(true);
  });

  test('suggestions loading when typing into search bar', () => {
    const wrapper = shallow(<KqlFilterBar {...defaultProps} />);
    expect(wrapper.state('isLoadingSuggestions')).toBe(false);
    // Simulate typing in by triggering change with inputValue and selectionStart
    const filterBar = wrapper.find('FilterBar');
    filterBar.simulate('change', 'n', 1);
    expect(wrapper.state('isLoadingSuggestions')).toBe(true);
  });
});
