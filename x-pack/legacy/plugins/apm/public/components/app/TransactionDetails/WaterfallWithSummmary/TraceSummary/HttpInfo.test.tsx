/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { HttpInfo } from './HttpInfo';
import * as exampleTransactions from './__fixtures__/transactions';
import { palettes } from '@elastic/eui';
import { cloneDeep, set } from 'lodash';

describe('HttpInfo', () => {
  describe('render', () => {
    const transaction = exampleTransactions.httpOk;
    const url = 'https://example.com';
    const props = { transaction, url };

    it('renders', () => {
      expect(() => shallow(<HttpInfo {...props} />)).not.toThrowError();
    });

    describe('with status code 200', () => {
      it('shows a success color', () => {
        const wrapper = mount(<HttpInfo {...props} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          palettes.euiPaletteForStatus.colors[0]
        );
      });
    });

    describe('with status code 301', () => {
      it('shows a warning color', () => {
        const p = cloneDeep(props);
        set(p, 'transaction.http.response.status_code', 301);

        const wrapper = mount(<HttpInfo {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          palettes.euiPaletteForStatus.colors[4]
        );
      });
    });

    describe('with status code 404', () => {
      it('shows a error color', () => {
        const p = cloneDeep(props);
        set(p, 'transaction.http.response.status_code', 404);

        const wrapper = mount(<HttpInfo {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          palettes.euiPaletteForStatus.colors[9]
        );
      });
    });

    describe('with status code 502', () => {
      it('shows a error color', () => {
        const p = cloneDeep(props);
        set(p, 'transaction.http.response.status_code', 502);

        const wrapper = mount(<HttpInfo {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          palettes.euiPaletteForStatus.colors[9]
        );
      });
    });

    describe('with some other status code', () => {
      it('shows the default color', () => {
        const p = cloneDeep(props);
        set(p, 'transaction.http.response.status_code', 700);

        const wrapper = mount(<HttpInfo {...p} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          'default'
        );
      });
    });
  });
});
