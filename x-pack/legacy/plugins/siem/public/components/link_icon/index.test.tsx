/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { TestProviders } from '../../mock';
import { LinkIcon } from './index';

describe('LinkIcon', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <LinkIcon href="#" iconSide="right" iconSize="xxl" iconType="alert">
        {'Test link'}
      </LinkIcon>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders an action button when onClick is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon iconType="alert" onClick={() => alert('Test alert')}>
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(
      wrapper
        .find('button')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders an action link when href is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon href="#" iconType="alert">
          {'Test link'}
        </LinkIcon>
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
        <LinkIcon iconType="alert">{'Test link'}</LinkIcon>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiIcon')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it positions the icon to the right when iconSide is right', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon iconSide="right" iconType="alert">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('.siemLinkIcon').first()).toHaveStyleRule('flex-direction', 'row-reverse');
  });

  test('it positions the icon to the left when iconSide is left (or not provided)', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon iconSide="left" iconType="alert">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('.siemLinkIcon').first()).not.toHaveStyleRule(
      'flex-direction',
      'row-reverse'
    );
  });

  test('it renders a label', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon iconType="alert">{'Test link'}</LinkIcon>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.siemLinkIcon__label')
        .first()
        .exists()
    ).toBe(true);
  });
});
