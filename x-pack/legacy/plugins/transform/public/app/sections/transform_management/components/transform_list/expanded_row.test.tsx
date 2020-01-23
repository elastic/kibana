/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import moment from 'moment-timezone';

import { TransformListRow } from '../../../../common';
import { ExpandedRow } from './expanded_row';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

describe('Transform: Transform List <ExpandedRow />', () => {
  // Set timezone to US/Eastern for consistent test results.
  beforeEach(() => {
    moment.tz.setDefault('US/Eastern');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  test('Minimal initialization', () => {
    const item: TransformListRow = transformListRow;

    const wrapper = shallow(<ExpandedRow item={item} />);

    expect(wrapper).toMatchSnapshot();
  });
});
