/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';

import { MatrixOverTimeHistogram } from '.';

jest.mock('@elastic/eui', () => {
  return {
    EuiPanel: (children: JSX.Element) => <>{children}</>,
    EuiLoadingContent: () => <div className="euiLoadingContent"></div>,
  };
});

jest.mock('../loader', () => {
  return {
    Loader: () => <div className="loader"></div>,
  };
});

jest.mock('../../lib/settings/use_kibana_ui_setting', () => {
  return { useKibanaUiSetting: () => [false] };
});

jest.mock('../header_panel', () => {
  return {
    HeaderPanel: () => <div className="headerPanel"></div>,
  };
});

jest.mock('../charts/barchart', () => {
  return {
    BarChart: () => <div className="barchart"></div>,
  };
});

describe('Load More Events Table Component', () => {
  const mockMatrixOverTimeHistogramProps = {
    data: [],
    dataKey: 'mockDataKey',
    endDate: new Date('2019-07-18T20:00:00.000Z').valueOf(),
    id: 'mockId',
    loading: true,
    updateDateRange: () => {},
    startDate: new Date('2019-07-18T19:00: 00.000Z').valueOf(),
    subtitle: 'mockSubtitle',
    totalCount: -1,
    title: 'mockTitle',
  };
  describe('rendering', () => {
    test('it renders EuiLoadingContent on initialLoad', () => {
      const wrapper = shallow(<MatrixOverTimeHistogram {...mockMatrixOverTimeHistogramProps} />);

      expect(wrapper.find(`[data-test-subj="initialLoadingPanelMatrixOverTime"]`)).toBeTruthy();
    });

    test('it renders Loader while fetching data if visited before', () => {
      const mockProps = {
        ...mockMatrixOverTimeHistogramProps,
        data: [{ x: new Date('2019-09-16T02:20:00.000Z').valueOf(), y: 3787, g: 'config_change' }],
        totalCount: 10,
        loading: true,
      };
      const wrapper = shallow(<MatrixOverTimeHistogram {...mockProps} />);
      expect(wrapper.find('.loader')).toBeTruthy();
    });

    test('it renders BarChart if data available', () => {
      const mockProps = {
        ...mockMatrixOverTimeHistogramProps,
        data: [{ x: new Date('2019-09-16T02:20:00.000Z').valueOf(), y: 3787, g: 'config_change' }],
        totalCount: 10,
        loading: false,
      };
      const wrapper = shallow(<MatrixOverTimeHistogram {...mockProps} />);

      expect(wrapper.find(`.barchart`)).toBeTruthy();
    });
  });
});
