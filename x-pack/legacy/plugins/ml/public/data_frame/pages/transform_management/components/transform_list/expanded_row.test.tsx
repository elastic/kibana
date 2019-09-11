/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import moment from 'moment-timezone';

import { DataFrameTransformListRow } from '../../../../common';
import { ExpandedRow } from './expanded_row';

import dataFrameTransformListRow from '../../../../common/__mocks__/data_frame_transform_list_row.json';

describe('Data Frame: Transform List <ExpandedRow />', () => {
  // Set timezone to US/Eastern for consistent test results.
  beforeEach(() => {
    moment.tz.setDefault('US/Eastern');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  test('Minimal initialization', () => {
    const item: DataFrameTransformListRow = dataFrameTransformListRow;

    const wrapper = shallow(<ExpandedRow item={item} />);

    expect(wrapper).toMatchSnapshot();
  });
});
