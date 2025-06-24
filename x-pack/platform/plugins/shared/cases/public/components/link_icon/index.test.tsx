/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../common/mock';
import { LinkIcon } from '.';

describe('LinkIcon', () => {
  const onClick = jest.fn;

  test('it renders', () => {
    const wrapper = shallow(
      <LinkIcon onClick={onClick} iconSide="right" iconSize="xxl" iconType="warning">
        {'Test link'}
      </LinkIcon>
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders an action button when onClick is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon iconType="warning" onClick={() => alert('Test alert')}>
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('button').first().exists()).toBe(true);
  });

  test('it renders an icon', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon onClick={onClick} iconType="warning">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('[data-euiicon-type]').first().exists()).toBe(true);
  });

  test('it positions the icon to the right when iconSide is right', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon onClick={onClick} iconSide="right" iconType="warning">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('[iconSide="right"]').exists()).toBeTruthy();
  });

  test('it positions the icon to the left when iconSide is left (or not provided)', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon onClick={onClick} iconSide="left" iconType="warning">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('[iconSide="left"]').exists()).toBeTruthy();
  });

  test('it renders a label', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon onClick={onClick} iconType="warning">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('.casesLinkIcon__label').first().exists()).toBe(true);
  });
});
