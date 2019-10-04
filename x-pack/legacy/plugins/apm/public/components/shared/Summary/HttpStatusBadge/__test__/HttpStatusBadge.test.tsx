/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { HttpStatusBadge } from '../index';

describe('HttpStatusBadge', () => {
  it('with status code 100', () => {
    const wrapper = mount(<HttpStatusBadge status={100} />);

    expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
      theme.euiColorDarkShade
    );
  });

  it('with status code 200', () => {
    const wrapper = mount(<HttpStatusBadge status={200} />);

    expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
      theme.euiColorSecondary
    );
  });

  it('with status code 301', () => {
    const wrapper = mount(<HttpStatusBadge status={301} />);

    expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
      theme.euiColorDarkShade
    );
  });

  it('with status code 404', () => {
    const wrapper = mount(<HttpStatusBadge status={404} />);

    expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
      theme.euiColorWarning
    );
  });

  it('with status code 502', () => {
    const wrapper = mount(<HttpStatusBadge status={502} />);

    expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
      theme.euiColorDanger
    );
  });

  it('with some other status code', () => {
    const wrapper = mount(<HttpStatusBadge status={700} />);

    expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
      'default'
    );
  });
});
