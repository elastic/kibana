/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { MetricsExpression } from './metrics_expression';

const defaultProps = {
  onChange: () => {},
};

test('Should render default props', () => {
  const component = shallow(<MetricsExpression {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('Should render metrics expression for metrics', () => {
  const component = shallow(
    <MetricsExpression
      {...defaultProps}
      metrics={[
        { type: 'count', label: 'my count' }, // should ignore label
        { type: 'max' }, // incomplete - no field, should not be included in expression
        { type: 'max', field: 'prop1', label: 'mostest' }, // should ignore label
      ]}
    />
  );

  expect(component).toMatchSnapshot();
});
