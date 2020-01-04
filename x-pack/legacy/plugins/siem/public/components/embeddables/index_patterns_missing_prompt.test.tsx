/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';

import { IndexPatternsMissingPromptComponent } from './index_patterns_missing_prompt';

jest.mock('../../lib/kibana');

describe('IndexPatternsMissingPrompt', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<IndexPatternsMissingPromptComponent />);
    expect(wrapper).toMatchSnapshot();
  });
});
