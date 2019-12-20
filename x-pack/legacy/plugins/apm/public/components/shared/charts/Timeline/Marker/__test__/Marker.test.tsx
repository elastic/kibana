/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Marker } from '../';
import {
  IWaterfallAgentMark,
  IWaterfallError
} from '../../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

describe('Marker', () => {
  it('renders agent marker', () => {
    const mark = {
      doc: {
        mark: 'agent'
      },
      offset: 1000,
      docType: 'agentMark'
    } as IWaterfallAgentMark;
    const component = shallow(<Marker mark={mark} x={10} />);
    expect(component).toMatchSnapshot();
  });

  it('renders error marker', () => {
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
      docType: 'error'
    } as unknown) as IWaterfallError;
    const component = shallow(<Marker mark={mark} x={10} />);
    expect(component).toMatchSnapshot();
  });
});
