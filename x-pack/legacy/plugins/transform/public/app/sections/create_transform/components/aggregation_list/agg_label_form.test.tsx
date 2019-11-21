/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { AggName, PivotAggsConfig, PIVOT_SUPPORTED_AGGS } from '../../../../common';

import { AggLabelForm } from './agg_label_form';

describe('Transform: <AggLabelForm />', () => {
  test('Date histogram aggregation', () => {
    const item: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.CARDINALITY,
      field: 'the-group-by-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const props = {
      item,
      otherAggNames: [],
      options: {},
      deleteHandler(l: AggName) {},
      onChange() {},
    };

    const wrapper = shallow(<AggLabelForm {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
