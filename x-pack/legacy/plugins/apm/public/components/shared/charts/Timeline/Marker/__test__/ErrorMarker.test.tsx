/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ErrorMarker } from '../ErrorMarker';
import { IWaterfallError } from '../../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

describe('ErrorMarker', () => {
  const mark = ({
    doc: {
      id: '123',
      name: 'foo',
      error: {
        trace: { id: '123' },
        transaction: { id: '456' },
        error: { grouping_key: '123' }
      },
      serviceColor: '#fff',
      serviceName: 'bar'
    },
    offset: 10000,
    skew: 0,
    docType: 'error'
  } as unknown) as IWaterfallError;
  it('renders', () => {
    const component = shallow(<ErrorMarker mark={mark} />);
    expect(component).toMatchSnapshot();
  });
});
