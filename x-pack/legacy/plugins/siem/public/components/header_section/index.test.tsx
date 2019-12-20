/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { TestProviders } from '../../mock';
import '../../mock/ui_settings';
import { HeaderSection } from './index';

jest.mock('../../lib/settings/use_kibana_ui_setting');

describe('HeaderSection', () => {
  test('it renders', () => {
    const wrapper = shallow(<HeaderSection title="Test title" />);

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders the title', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-section-title"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the subtitle when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection subtitle="Test subtitle" title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-section-subtitle"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it DOES NOT render the subtitle when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-section-subtitle"]')
        .first()
        .exists()
    ).toBe(false);
  });

  test('it renders a transparent inspect button when showInspect is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" id="test" showInspect={false} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="transparent-inspect-container"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders an opaque inspect button when showInspect is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" id="test" showInspect={true} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="opaque-inspect-container"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders supplements when children provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-section-supplements"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it DOES NOT render supplements when children not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-section-supplements"]')
        .first()
        .exists()
    ).toBe(false);
  });

  test('it applies border styles when border is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection border title="Test title" />
      </TestProviders>
    );
    const siemHeaderSection = wrapper.find('.siemHeaderSection').first();

    expect(siemHeaderSection).toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(siemHeaderSection).toHaveStyleRule('padding-bottom', euiDarkVars.paddingSizes.l);
  });

  test('it DOES NOT apply border styles when border is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );
    const siemHeaderSection = wrapper.find('.siemHeaderSection').first();

    expect(siemHeaderSection).not.toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(siemHeaderSection).not.toHaveStyleRule('padding-bottom', euiDarkVars.paddingSizes.l);
  });

  test('it splits the title and supplement areas evenly when split is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection split title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiFlexItem--flexGrowZero[data-test-subj="header-section-supplements"]')
        .first()
        .exists()
    ).toBe(false);
  });

  test('it DOES NOT split the title and supplement areas evenly when split is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiFlexItem--flexGrowZero[data-test-subj="header-section-supplements"]')
        .first()
        .exists()
    ).toBe(true);
  });
});
