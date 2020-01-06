/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { TestProviders } from '../../mock';
import { Subtitle } from './index';

describe('Subtitle', () => {
  test('it renders', () => {
    const wrapper = shallow(<Subtitle items="Test subtitle" />);

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders one subtitle string item', () => {
    const wrapper = mount(
      <TestProviders>
        <Subtitle items="Test subtitle" />
      </TestProviders>
    );

    expect(wrapper.find('.siemSubtitle__item--text').length).toEqual(1);
  });

  test('it renders multiple subtitle string items', () => {
    const wrapper = mount(
      <TestProviders>
        <Subtitle items={['Test subtitle 1', 'Test subtitle 2']} />
      </TestProviders>
    );

    expect(wrapper.find('.siemSubtitle__item--text').length).toEqual(2);
  });

  test('it renders one subtitle React.ReactNode item', () => {
    const wrapper = mount(
      <TestProviders>
        <Subtitle items={<span>{'Test subtitle'}</span>} />
      </TestProviders>
    );

    expect(wrapper.find('.siemSubtitle__item--node').length).toEqual(1);
  });

  test('it renders multiple subtitle React.ReactNode items', () => {
    const wrapper = mount(
      <TestProviders>
        <Subtitle items={[<span>{'Test subtitle 1'}</span>, <span>{'Test subtitle 2'}</span>]} />
      </TestProviders>
    );

    expect(wrapper.find('.siemSubtitle__item--node').length).toEqual(2);
  });

  test('it renders multiple subtitle items of mixed type', () => {
    const wrapper = mount(
      <TestProviders>
        <Subtitle items={['Test subtitle 1', <span>{'Test subtitle 2'}</span>]} />
      </TestProviders>
    );

    expect(wrapper.find('.siemSubtitle__item').length).toEqual(2);
  });
});
