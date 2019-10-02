/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { HttpInfoSummaryItem } from '../';
import * as exampleTransactions from '../../__fixtures__/transactions';

describe('HttpInfoSummaryItem', () => {
  describe('render', () => {
    const transaction = exampleTransactions.httpOk;
    const url = 'https://example.com';
    const method = 'get';
    const props = { transaction, url, method, status: 100 };

    it('renders', () => {
      expect(() =>
        shallow(<HttpInfoSummaryItem {...props} />)
      ).not.toThrowError();
    });

    describe('with status code 100', () => {
      it('shows a success color', () => {
        const wrapper = mount(<HttpInfoSummaryItem {...props} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          theme.euiColorDarkShade
        );
      });
    });

    describe('with status code 200', () => {
      it('shows a success color', () => {
        const p = { ...props, status: 200 };
        const wrapper = mount(<HttpInfoSummaryItem {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          theme.euiColorSecondary
        );
      });
    });

    describe('with status code 301', () => {
      it('shows a warning color', () => {
        const p = { ...props, status: 301 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          theme.euiColorDarkShade
        );
      });
    });

    describe('with status code 404', () => {
      it('shows a error color', () => {
        const p = { ...props, status: 404 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          theme.euiColorWarning
        );
      });
    });

    describe('with status code 502', () => {
      it('shows a error color', () => {
        const p = { ...props, status: 502 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          theme.euiColorDanger
        );
      });
    });

    describe('with some other status code', () => {
      it('shows the default color', () => {
        const p = { ...props, status: 700 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          'default'
        );
      });
    });
  });
});
