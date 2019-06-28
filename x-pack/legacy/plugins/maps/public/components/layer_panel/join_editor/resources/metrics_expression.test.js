/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { MetricsExpression } from './metrics_expression';


const defaultProps = {
  onChange: () => {}
};

test('Should render default props', () => {
  const component = shallow(
    <MetricsExpression
      {...defaultProps}
    />
  );

  expect(component)
    .toMatchSnapshot();
});

test('Should use custom labels and remove incomplete metrics in metric expression', () => {
  const component = shallow(
    <MetricsExpression
      {...defaultProps}
      metrics={[
        { type: 'count' },
        { type: 'count', label: 'my count' },
        { type: 'max' }, // incomplete - no field, should not be included in expression
        { type: 'max', field: 'prop1' },
        { type: 'max', field: 'prop1', label: 'mostest' },
      ]}
    />
  );

  expect(component)
    .toMatchSnapshot();
});


