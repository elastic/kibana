/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Marker } from '../';

describe('Marker', () => {
  it('renders agent marker', () => {
    const mark = {
      name: 'agent',
      offset: 1000,
      type: 'agentMark'
    } as IWaterfallItemAgentMark;
    const component = shallow(<Marker mark={mark} x={10} />);
    expect(component).toMatchSnapshot();
  });

  it('renders error marker', () => {
    const mark = ({
      error: {
        trace: { id: '123' },
        transaction: { id: '456' },
        error: { grouping_key: '123' }
      },
      id: '123',
      name: 'foo',
      offset: 10000,
      serviceColor: '#fff',
      serviceName: 'bar'
    } as unknown) as IWaterfallItemError;
    const component = shallow(<Marker mark={mark} x={10} />);
    expect(component).toMatchSnapshot();
  });
});
