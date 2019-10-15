/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import 'jest-styled-components';
import React from 'react';

import '../../mock/ui_settings';
import { TestProviders } from '../../mock';
import { UtilityBarAction } from './index';

jest.mock('../../lib/settings/use_kibana_ui_setting');

describe('UtilityBarAction', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <UtilityBarAction>{'Test action'}</UtilityBarAction>
      </TestProviders>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders an action button', () => {
    const wrapper = mount(
      <TestProviders>
        <UtilityBarAction onClick={() => alert('Test alert')}>{'Test action'}</UtilityBarAction>
      </TestProviders>
    );

    expect(
      wrapper
        .find('button')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders an action link', () => {
    const wrapper = mount(
      <TestProviders>
        <UtilityBarAction href="#">{'Test action'}</UtilityBarAction>
      </TestProviders>
    );

    expect(
      wrapper
        .find('a')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders an icon', () => {
    const wrapper = mount(
      <TestProviders>
        <UtilityBarAction iconType="cross">{'Test action'}</UtilityBarAction>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiIcon')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it can right-align an icon', () => {
    const wrapper = mount(
      <TestProviders>
        <UtilityBarAction iconSide="right" iconType="cross">
          {'Test action'}
        </UtilityBarAction>
      </TestProviders>
    );

    expect(wrapper.find('.siemUtilityBar__action').first()).toHaveStyleRule(
      'flex-direction',
      'row-reverse'
    );
  });

  test('it renders a popover', () => {
    const wrapper = mount(
      <TestProviders>
        <UtilityBarAction popoverContent={<p>{'Test popover'}</p>}>
          {'Test action'}
        </UtilityBarAction>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiPopover')
        .first()
        .exists()
    ).toBe(true);
  });

  test('the popover action has an arrow icon', () => {
    const wrapper = mount(
      <TestProviders>
        <UtilityBarAction popoverContent={<p>{'Test popover'}</p>}>
          {'Test action'}
        </UtilityBarAction>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiIcon')
        .first()
        .exists()
    ).toBe(true);
  });
});
