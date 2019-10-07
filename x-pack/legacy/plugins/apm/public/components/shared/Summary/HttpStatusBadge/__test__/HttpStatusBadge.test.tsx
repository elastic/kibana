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
  describe('render', () => {
    describe('with status code 100', () => {
      it('renders with the dark shade color', () => {
        const wrapper = mount(<HttpStatusBadge status={100} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          theme.euiColorDarkShade
        );
      });
    });
    describe('with status code 200', () => {
      it('renders with Secondary color', () => {
        const wrapper = mount(<HttpStatusBadge status={200} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          theme.euiColorSecondary
        );
      });
    });
    describe('with status code 301', () => {
      it('renders with dark shade color', () => {
        const wrapper = mount(<HttpStatusBadge status={301} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          theme.euiColorDarkShade
        );
      });
    });
    describe('with status code 404', () => {
      it('renders with Warning color', () => {
        const wrapper = mount(<HttpStatusBadge status={404} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          theme.euiColorWarning
        );
      });
    });
    describe('with status code 502', () => {
      it('renders with Danger color', () => {
        const wrapper = mount(<HttpStatusBadge status={502} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          theme.euiColorDanger
        );
      });
    });
    describe('with other status code', () => {
      it('renders with default color', () => {
        const wrapper = mount(<HttpStatusBadge status={700} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          'default'
        );
      });
    });
  });
});
