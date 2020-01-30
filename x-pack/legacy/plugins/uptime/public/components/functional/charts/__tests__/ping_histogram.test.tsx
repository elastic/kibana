/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { PingHistogramComponent, PingHistogramComponentProps } from '../ping_histogram';

describe('PingHistogram component', () => {
  const props: PingHistogramComponentProps = {
    absoluteStartDate: 1548697920000,
    absoluteEndDate: 1548700920000,
  };

  it('renders the component without errors', () => {
    const component = shallowWithIntl(<PingHistogramComponent {...props} />);
    expect(component).toMatchSnapshot();
  });
});
