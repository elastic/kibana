/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { RuleSwitchComponent } from './index';
jest.mock('../../../../../lib/kibana');

describe('RuleSwitch', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <RuleSwitchComponent enabled={true} id={'7'} isLoading={false} optionLabel="rule-switch" />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
