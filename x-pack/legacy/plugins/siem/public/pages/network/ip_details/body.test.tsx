/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import { IPDetailsBody } from './body';
import React from 'react';

import '../../../mock/ui_settings';
import { CommonChildren } from './types';
import toJson from 'enzyme-to-json';
import { TestProviders } from '../../../mock/test_providers';

describe('body', () => {
  test('render snapshot', () => {
    const child: CommonChildren = () => <span>{'I am a child'}</span>;
    const wrapper = shallow(
      <TestProviders>
        <IPDetailsBody
          children={child}
          from={0}
          isInitializing={false}
          detailName={'host-1'}
          setQuery={() => {}}
          to={0}
        />
      </TestProviders>
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it should pass expected object properties to children', () => {
    const child = jest.fn();
    mount(
      <TestProviders>
        <IPDetailsBody
          children={child}
          from={0}
          isInitializing={false}
          detailName={'host-1'}
          setQuery={() => {}}
          to={0}
        />
      </TestProviders>
    );

    // match against everything but the functions to ensure they are there as expected
    expect(child.mock.calls[0][0]).toMatchObject({
      endDate: 0,
      filterQuery: '',
      skip: false,
      startDate: 0,
      type: 'details',
    });
  });
});
