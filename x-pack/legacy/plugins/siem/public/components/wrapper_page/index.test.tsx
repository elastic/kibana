/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { TestProviders } from '../../mock';
import '../../mock/ui_settings';
import { WrapperPage } from './index';

jest.mock('../../lib/settings/use_kibana_ui_setting');

describe('WrapperPage', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <WrapperPage>
          <p>{'Test page'}</p>
        </WrapperPage>
      </TestProviders>
    );

    expect(toJson(wrapper.find('WrapperPage'))).toMatchSnapshot();
  });

  describe('restrict width', () => {
    test('default max width when restrictWidth is true', () => {
      const wrapper = shallow(
        <TestProviders>
          <WrapperPage restrictWidth>
            <p>{'Test page'}</p>
          </WrapperPage>
        </TestProviders>
      );

      expect(toJson(wrapper.find('WrapperPage'))).toMatchSnapshot();
    });

    test('custom max width when restrictWidth is number', () => {
      const wrapper = shallow(
        <TestProviders>
          <WrapperPage restrictWidth={600}>
            <p>{'Test page'}</p>
          </WrapperPage>
        </TestProviders>
      );

      expect(toJson(wrapper.find('WrapperPage'))).toMatchSnapshot();
    });

    test('custom max width when restrictWidth is string', () => {
      const wrapper = shallow(
        <TestProviders>
          <WrapperPage restrictWidth="600px">
            <p>{'Test page'}</p>
          </WrapperPage>
        </TestProviders>
      );

      expect(toJson(wrapper.find('WrapperPage'))).toMatchSnapshot();
    });
  });
});
