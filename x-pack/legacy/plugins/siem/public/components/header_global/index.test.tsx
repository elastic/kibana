/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import 'jest-styled-components';
import React from 'react';

import { TestProviders } from '../../mock';
import '../../mock/match_media';
import '../../mock/ui_settings';
import { HeaderGlobal } from './index';

jest.mock('../../lib/settings/use_kibana_ui_setting');

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar
jest.mock('../search_bar', () => ({
  SiemSearchBar: () => null,
}));

describe('HeaderGlobal', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <HeaderGlobal />
      </TestProviders>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it applies offset styles when offsetRight is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderGlobal offsetRight="100px" />
      </TestProviders>
    );
    const siemHeaderGlobal = wrapper.find('.siemHeaderGlobal').first();

    expect(siemHeaderGlobal).toHaveStyleRule('margin', `0 -100px 0 -${euiDarkVars.euiSizeL}`);
    expect(siemHeaderGlobal).toHaveStyleRule(
      'padding',
      `${euiDarkVars.paddingSizes.m} 100px ${euiDarkVars.paddingSizes.m} ${euiDarkVars.paddingSizes.l}`
    );
  });

  test('it DOES NOT apply offset styles when offsetRight is not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderGlobal />
      </TestProviders>
    );
    const siemHeaderGlobal = wrapper.find('.siemHeaderGlobal').first();

    expect(siemHeaderGlobal).toHaveStyleRule(
      'margin',
      `0 -${euiDarkVars.euiSizeL} 0 -${euiDarkVars.euiSizeL}`
    );
    expect(siemHeaderGlobal).toHaveStyleRule(
      'padding',
      `${euiDarkVars.paddingSizes.m} ${euiDarkVars.paddingSizes.l} ${euiDarkVars.paddingSizes.m} ${euiDarkVars.paddingSizes.l}`
    );
  });
});
