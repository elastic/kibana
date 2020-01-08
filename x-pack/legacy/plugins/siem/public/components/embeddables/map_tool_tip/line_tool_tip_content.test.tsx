/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import { LineToolTipContentComponent } from './line_tool_tip_content';
import { FeatureProperty } from '../types';
import { SUM_OF_DESTINATION_BYTES, SUM_OF_SOURCE_BYTES } from '../map_config';

describe('LineToolTipContent', () => {
  const mockFeatureProps: FeatureProperty[] = [
    {
      _propertyKey: SUM_OF_DESTINATION_BYTES,
      _rawValue: 'testPropValue',
    },
    {
      _propertyKey: SUM_OF_SOURCE_BYTES,
      _rawValue: 'testPropValue',
    },
  ];

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <LineToolTipContentComponent contextId={'contextId'} featureProps={mockFeatureProps} />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
