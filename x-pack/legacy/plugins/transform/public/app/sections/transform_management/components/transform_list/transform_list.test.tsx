/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import './transform_list.test.mocks';
import { TransformList } from './transform_list';

jest.mock('ui/new_platform');

describe('Transform: Transform List <TransformList />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(
      <TransformList
        errorMessage={undefined}
        isInitialized={true}
        onCreateTransform={jest.fn()}
        transforms={[]}
        transformsLoading={false}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
