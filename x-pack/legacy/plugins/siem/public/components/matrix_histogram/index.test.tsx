/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';

import { MatrixHistogram } from '.';
import { EventsOverTimeGqlQuery as mockQuery } from '../../pages/hosts/navigation';

jest.mock('../../lib/kibana');

jest.mock('../loader', () => {
  return {
    Loader: () => <div className="loader" />,
  };
});

jest.mock('../header_section', () => {
  return {
    HeaderSection: () => <div className="headerSection" />,
  };
});

jest.mock('../charts/barchart', () => {
  return {
    BarChart: () => <div className="barchart" />,
  };
});

describe('Matrix Histogram Component', () => {
  const mockMatrixOverTimeHistogramProps = {
    dataKey: 'mockDataKey',
    defaultIndex: ['defaultIndex'],
    defaultStackByOption: { text: 'text', value: 'value' },
    endDate: new Date('2019-07-18T20:00:00.000Z').valueOf(),
    id: 'mockId',
    isInspected: false,
    isPtrIncluded: false,
    query: mockQuery,
    setQuery: jest.fn(),
    skip: false,
    sourceId: 'default',
    stackByOptions: [{ text: 'text', value: 'value' }],
    startDate: new Date('2019-07-18T19:00: 00.000Z').valueOf(),
    subtitle: 'mockSubtitle',
    totalCount: -1,
    title: 'mockTitle',
    updateDateRange: jest.fn(),
  };
  describe('rendering', () => {
    test('it renders EuiLoadingContent on initialLoad', () => {
      const wrapper = shallow(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />);

      expect(wrapper.find(`[data-test-subj="initialLoadingPanelMatrixOverTime"]`)).toBeTruthy();
    });

    test('it renders Loader while fetching data if visited before', () => {
      const mockProps = {
        ...mockMatrixOverTimeHistogramProps,
        data: [{ x: new Date('2019-09-16T02:20:00.000Z').valueOf(), y: 3787, g: 'config_change' }],
        totalCount: 10,
        loading: true,
      };
      const wrapper = shallow(<MatrixHistogram {...mockProps} />);
      expect(wrapper.find('.loader')).toBeTruthy();
    });

    test('it renders BarChart if data available', () => {
      const mockProps = {
        ...mockMatrixOverTimeHistogramProps,
        data: [{ x: new Date('2019-09-16T02:20:00.000Z').valueOf(), y: 3787, g: 'config_change' }],
        totalCount: 10,
        loading: false,
      };
      const wrapper = shallow(<MatrixHistogram {...mockProps} />);

      expect(wrapper.find(`.barchart`)).toBeTruthy();
    });
  });
});
