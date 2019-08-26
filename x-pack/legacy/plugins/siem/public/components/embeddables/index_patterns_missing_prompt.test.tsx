/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { IndexPatternsMissingPrompt } from './index_patterns_missing_prompt';

describe('IndexPatternsMissingPrompt', () => {
  test('renders correctly against snapshot when empty index pattern string is provided', () => {
    const wrapper = shallow(<IndexPatternsMissingPrompt indexPatterns="" />);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('renders correctly against snapshot when index patterns are provided', () => {
    const wrapper = shallow(<IndexPatternsMissingPrompt indexPatterns="auditbeat-*" />);
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
