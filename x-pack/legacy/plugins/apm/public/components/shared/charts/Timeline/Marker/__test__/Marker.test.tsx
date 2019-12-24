/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Marker } from '../';
import { IWaterfallError } from '../../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import { AgentMark } from '../../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/get_agent_marks';

describe('Marker', () => {
  it('renders agent marker', () => {
    const mark = {
      name: 'agent',
      offset: 1000,
      docType: 'agentMark'
    } as AgentMark;
    const component = shallow(<Marker mark={mark} x={10} />);
    expect(component).toMatchSnapshot();
  });

  it('renders error marker', () => {
    const mark = {
      id: '123',
      custom: {
        trace: { id: '123' },
        transaction: { id: '456' },
        error: { grouping_key: '123' },
        service: { name: 'bar' }
      },
      serviceColor: '#fff',
      offset: 10000,
      docType: 'error'
    } as IWaterfallError;
    const component = shallow(<Marker mark={mark} x={10} />);
    expect(component).toMatchSnapshot();
  });
});
