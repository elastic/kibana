/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { useKibanaCore } from '../../../../../lib/compose/kibana_core';

import { RuleSwitchComponent } from './index';

const mockUseKibanaCore = useKibanaCore as jest.Mock;
jest.mock('../../../../../lib/compose/kibana_core');
mockUseKibanaCore.mockImplementation(() => ({
  uiSettings: {
    get$: () => 'world',
  },
  injectedMetadata: {
    getKibanaVersion: () => '8.0.0',
  },
}));

describe('RuleSwitch', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <RuleSwitchComponent optionLabel="rule-switch" enabled={true} id={'7'} isLoading={false} />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
