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

import '../../mock/ui_settings';
import { TestProviders } from '../../mock';
import { HeaderPanel } from './index';

jest.mock('../../lib/settings/use_kibana_ui_setting');

describe('HeaderPanel', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <HeaderPanel title="Test title" />
      </TestProviders>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders the title', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPanel title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-panel-title"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the subtitle when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPanel subtitle="Test subtitle" title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find(`[data-test-subj="header-panel-subtitle"]`)
        .first()
        .exists()
    ).toBe(true);
  });

  test('it DOES NOT render the subtitle when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPanel title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find(`[data-test-subj="header-panel-subtitle"]`)
        .first()
        .exists()
    ).toBe(false);
  });

  test('it renders a transparent inspect button when showInspect is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPanel title="Test title" id="test" showInspect={false} />
      </TestProviders>
    );

    expect(
      wrapper
        .find(`[data-test-subj="transparent-inspect-container"]`)
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders an opaque inspect button when showInspect is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPanel title="Test title" id="test" showInspect={true} />
      </TestProviders>
    );

    expect(
      wrapper
        .find(`[data-test-subj="opaque-inspect-container"]`)
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders supplements when children provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPanel title="Test title">
          <p>{'Test children'}</p>
        </HeaderPanel>
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-panel-supplements"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it DOES NOT render supplements when children not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPanel title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-panel-supplements"]')
        .first()
        .exists()
    ).toBe(false);
  });

  test('it applies border styles when border is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPanel border title="Test title" />
      </TestProviders>
    );
    const siemHeaderPanel = wrapper.find('.siemHeaderPanel').first();

    expect(siemHeaderPanel).toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(siemHeaderPanel).toHaveStyleRule('padding-bottom', euiDarkVars.euiSizeL);
  });

  test('it DOES NOT apply border styles when border is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPanel title="Test title" />
      </TestProviders>
    );
    const siemHeaderPanel = wrapper.find('.siemHeaderPanel').first();

    expect(siemHeaderPanel).not.toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(siemHeaderPanel).not.toHaveStyleRule('padding-bottom', euiDarkVars.euiSizeL);
  });
});
