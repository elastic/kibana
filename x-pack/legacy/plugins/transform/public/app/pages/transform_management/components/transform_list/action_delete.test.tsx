/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { DataFrameTransformListRow } from '../../../../common';
import { DeleteAction } from './action_delete';

import dataFrameTransformListRow from '../../../../common/__mocks__/data_frame_transform_list_row.json';

describe('Data Frame: Transform List Actions <DeleteAction />', () => {
  test('Minimal initialization', () => {
    const item: DataFrameTransformListRow = dataFrameTransformListRow;
    const props = {
      disabled: false,
      items: [item],
      deleteTransform(d: DataFrameTransformListRow) {},
    };

    const wrapper = shallow(<DeleteAction {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
