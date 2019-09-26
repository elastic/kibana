/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import 'jest-styled-components';
import * as React from 'react';

import { TruncatableText } from '.';

describe('TruncatableText', () => {
  const width = '50px';

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <TruncatableText width={width}>{'Hiding in plain sight'}</TruncatableText>
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it adds the hidden overflow style', () => {
    const wrapper = mount(
      <TruncatableText width={width}>{'Hiding in plain sight'}</TruncatableText>
    );

    expect(wrapper).toHaveStyleRule('overflow', 'hidden');
  });

  test('it adds the ellipsis text-overflow style', () => {
    const wrapper = mount(<TruncatableText width={width}>{'Dramatic pause'}</TruncatableText>);

    expect(wrapper).toHaveStyleRule('text-overflow', 'ellipsis');
  });

  test('it adds the nowrap white-space style', () => {
    const wrapper = mount(
      <TruncatableText width={width}>{'Who stopped the beats?'}</TruncatableText>
    );

    expect(wrapper).toHaveStyleRule('white-space', 'nowrap');
  });

  test('it forwards the width prop as a style', () => {
    const wrapper = mount(
      <TruncatableText width={width}>{'width or without you'}</TruncatableText>
    );

    expect(wrapper).toHaveStyleRule('width', width);
  });
});
