/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock';
import { HeaderPage } from './index';
import { useMountAppended } from '../../utils/use_mount_appended';

describe('HeaderPage', () => {
  const mount = useMountAppended();

  test('it renders', () => {
    const wrapper = shallow(
      <HeaderPage
        badgeOptions={{ beta: true, text: 'Beta', tooltip: 'Test tooltip' }}
        border
        subtitle="Test subtitle"
        subtitle2="Test subtitle 2"
        title="Test title"
      >
        <p>{'Test supplement'}</p>
      </HeaderPage>
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the title', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-page-title"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the back link when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage backOptions={{ href: '#', text: 'Test link' }} title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('.siemHeaderPage__linkBack')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it DOES NOT render the back link when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('.siemHeaderPage__linkBack')
        .first()
        .exists()
    ).toBe(false);
  });

  test('it renders the first subtitle when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage subtitle="Test subtitle" title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-page-subtitle"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it DOES NOT render the first subtitle when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-section-subtitle"]')
        .first()
        .exists()
    ).toBe(false);
  });

  test('it renders the second subtitle when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage subtitle2="Test subtitle 2" title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-page-subtitle-2"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it DOES NOT render the second subtitle when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-section-subtitle-2"]')
        .first()
        .exists()
    ).toBe(false);
  });

  test('it renders supplements when children provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title">
          <p>{'Test supplement'}</p>
        </HeaderPage>
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-page-supplements"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it DOES NOT render supplements when children not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-page-supplements"]')
        .first()
        .exists()
    ).toBe(false);
  });

  test('it applies border styles when border is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage border title="Test title" />
      </TestProviders>
    );
    const siemHeaderPage = wrapper.find('.siemHeaderPage').first();

    expect(siemHeaderPage).toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(siemHeaderPage).toHaveStyleRule('padding-bottom', euiDarkVars.paddingSizes.l);
  });

  test('it DOES NOT apply border styles when border is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );
    const siemHeaderPage = wrapper.find('.siemHeaderPage').first();

    expect(siemHeaderPage).not.toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(siemHeaderPage).not.toHaveStyleRule('padding-bottom', euiDarkVars.paddingSizes.l);
  });

  test('it renders as a draggable when arguments provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage draggableArguments={{ field: 'neat', value: 'cool' }} title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-page-draggable"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it DOES NOT render as a draggable when arguments not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-page-draggable"]')
        .first()
        .exists()
    ).toBe(false);
  });
});
