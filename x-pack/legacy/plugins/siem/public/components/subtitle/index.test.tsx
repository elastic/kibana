/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import '../../mock/ui_settings';
import { TestProviders } from '../../mock';
import { Subtitle } from './index';

jest.mock('../../lib/settings/use_kibana_ui_setting');

describe('Subtitle', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <Subtitle text="Test subtitle" />
      </TestProviders>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders one subtitle item', () => {
    const wrapper = mount(
      <TestProviders>
        <Subtitle text="Test subtitle" />
      </TestProviders>
    );

    expect(wrapper.find('p').length).toEqual(1);
  });

  test('it renders multiple subtitle items', () => {
    const wrapper = mount(
      <TestProviders>
        <Subtitle text={['Test subtitle 1', 'Test subtitle 2']} />
      </TestProviders>
    );

    expect(wrapper.find('p').length).toEqual(2);
  });
});
