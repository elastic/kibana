/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import './transform_list.test.mocks';
import { DataFrameTransformList } from './transform_list';

describe('Transform: Transform List <DataFrameTransformList />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(
      <DataFrameTransformList
        isInitialized={true}
        transforms={[]}
        errorMessage={undefined}
        transformsLoading={false}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
