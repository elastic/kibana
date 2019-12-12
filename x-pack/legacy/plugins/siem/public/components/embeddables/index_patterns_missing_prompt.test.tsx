/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { mockKibanaCoreFactory } from '../../mock/kibana_core';
import { IndexPatternsMissingPromptComponent } from './index_patterns_missing_prompt';

jest.mock('../../lib/compose/kibana_core', () => mockKibanaCoreFactory());

describe('IndexPatternsMissingPrompt', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<IndexPatternsMissingPromptComponent />);
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
