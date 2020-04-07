/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock';
import { WrapperPage } from './index';

describe('WrapperPage', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <WrapperPage>
        <p>{'Test page'}</p>
      </WrapperPage>,
      { wrappingComponent: TestProviders }
    );

    expect(wrapper.find('[className="siemWrapperPage"]')).toHaveLength(1);
  });

  describe('restrict width', () => {
    test('default max width when restrictWidth is true', () => {
      const wrapper = mount(
        <WrapperPage restrictWidth>
          <p>{'Test page'}</p>
        </WrapperPage>,
        { wrappingComponent: TestProviders }
      );

      expect(
        wrapper.find('[className="siemWrapperPage siemWrapperPage--restrictWidthDefault"]')
      ).toHaveLength(1);
    });

    test('custom max width when restrictWidth is number', () => {
      const wrapper = mount(
        <WrapperPage restrictWidth={800}>
          <p>{'Test page'}</p>
        </WrapperPage>,
        { wrappingComponent: TestProviders }
      );

      expect(
        wrapper.find('[className="siemWrapperPage siemWrapperPage--restrictWidthDefault"]')
      ).toHaveLength(0);
      expect(wrapper.find('Wrapper').prop('style')).toEqual({ maxWidth: '800px' });
    });

    test('custom max width when restrictWidth is string', () => {
      const wrapper = mount(
        <WrapperPage restrictWidth="800px">
          <p>{'Test page'}</p>
        </WrapperPage>,
        { wrappingComponent: TestProviders }
      );

      expect(
        wrapper.find('[className="siemWrapperPage siemWrapperPage--restrictWidthDefault"]')
      ).toHaveLength(0);
      expect(wrapper.find('Wrapper').prop('style')).toEqual({ maxWidth: '800px' });
    });
  });
});
