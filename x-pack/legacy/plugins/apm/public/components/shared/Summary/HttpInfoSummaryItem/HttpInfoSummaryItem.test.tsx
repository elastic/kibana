/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { palettes } from '@elastic/eui';
import { HttpInfoSummaryItem } from './';
import * as exampleTransactions from '../__fixtures__/transactions';

describe('HttpInfoSummaryItem', () => {
  describe('render', () => {
    const transaction = exampleTransactions.httpOk;
    const url = 'https://example.com';
    const method = 'get';
    const props = { transaction, url, method, status: 200 };

    it('renders', () => {
      expect(() =>
        shallow(<HttpInfoSummaryItem {...props} />)
      ).not.toThrowError();
    });

    describe('with status code 200', () => {
      it('shows a success color', () => {
        const wrapper = mount(<HttpInfoSummaryItem {...props} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          palettes.euiPaletteForStatus.colors[0]
        );
      });
    });

    describe('with status code 301', () => {
      it('shows a warning color', () => {
        const p = { ...props, status: 301 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          palettes.euiPaletteForStatus.colors[4]
        );
      });
    });

    describe('with status code 404', () => {
      it('shows a error color', () => {
        const p = { ...props, status: 404 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          palettes.euiPaletteForStatus.colors[9]
        );
      });
    });

    describe('with status code 502', () => {
      it('shows a error color', () => {
        const p = { ...props, status: 502 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          palettes.euiPaletteForStatus.colors[9]
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
