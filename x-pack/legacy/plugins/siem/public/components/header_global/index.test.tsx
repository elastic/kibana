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

    expect(siemHeaderGlobal).toHaveStyleRule('margin-right', '-100px');
    expect(siemHeaderGlobal).toHaveStyleRule('padding-right', '100px');
  });

  test('it DOES NOT apply offset styles when offsetRight is not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderGlobal />
      </TestProviders>
    );
    const siemHeaderGlobal = wrapper.find('.siemHeaderGlobal').first();

    expect(siemHeaderGlobal).toHaveStyleRule('margin-right', euiDarkVars.euiSizeL);
    expect(siemHeaderGlobal).toHaveStyleRule('padding-right', euiDarkVars.euiSizeL);
  });
});
