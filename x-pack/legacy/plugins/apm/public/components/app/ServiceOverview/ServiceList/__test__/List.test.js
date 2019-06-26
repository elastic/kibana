/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ServiceList, SERVICE_COLUMNS } from '../index';
import props from './props.json';
import { mockMoment } from '../../../../../utils/testHelpers';

describe('ErrorGroupOverview -> List', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('should render empty state', () => {
    const wrapper = shallow(<ServiceList items={[]} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render with data', () => {
    const wrapper = shallow(<ServiceList items={props.items} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render columns correctly', () => {
    const service = {
      serviceName: 'opbeans-python',
      agentName: 'python',
      transactionsPerMinute: 86.93333333333334,
      errorsPerMinute: 12.6,
      avgResponseTime: 91535.42944785276,
      environments: ['test']
    };
    const renderedColumns = SERVICE_COLUMNS.map(c =>
      c.render(service[c.field], service)
    );
    expect(renderedColumns[0]).toMatchSnapshot();
    expect(renderedColumns.slice(2)).toEqual([
      'python',
      '92 ms',
      '86.9 tpm',
      '12.6 err.'
    ]);
  });
});
