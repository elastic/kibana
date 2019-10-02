/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import dataFrameTransformListRow from '../../../../common/__mocks__/data_frame_transform_list_row.json';

import { ExpandedRowJsonPane } from './expanded_row_json_pane';

describe('Data Frame: Transform List Expanded Row <ExpandedRowJsonPane />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(<ExpandedRowJsonPane json={dataFrameTransformListRow.config} />);

    expect(wrapper).toMatchSnapshot();
  });
});
