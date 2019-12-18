/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ErrorMarker } from '../ErrorMarker';
import { IWaterfallItemError } from '../../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

describe('ErrorMarker', () => {
  const mark = ({
    error: {
      trace: { id: '123' },
      transaction: { id: '456' },
      error: { grouping_key: '123' }
    },
    id: '123',
    name: 'foo',
    offset: 10000,
    skew: 0,
    serviceColor: '#fff',
    serviceName: 'bar'
  } as unknown) as IWaterfallItemError;
  it('renders', () => {
    const component = shallow(<ErrorMarker mark={mark} />);
    expect(component).toMatchSnapshot();
  });
});
