/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, ShallowWrapper } from 'enzyme';
import * as React from 'react';

import { BarChartBaseComponent, BarChartWithCustomPrompt, BarChart } from './barchart';
import { ChartSeriesData, ChartHolder } from './common';
import { BarSeries, ScaleType, Axis } from '@elastic/charts';

jest.mock('@elastic/charts');
const customHeight = '100px';
const customWidth = '120px';
describe('BarChartBaseComponent', () => {
  let shallowWrapper: ShallowWrapper;
  const mockBarChartData: ChartSeriesData[] = [
    {
      key: 'uniqueSourceIps',
      value: [{ y: 1714, x: 'uniqueSourceIps', g: 'uniqueSourceIps' }],
      color: '#DB1374',
    },
    {
      key: 'uniqueDestinationIps',
      value: [{ y: 2354, x: 'uniqueDestinationIps', g: 'uniqueDestinationIps' }],
      color: '#490092',
    },
  ];

  describe('render', () => {
    beforeAll(() => {
      shallowWrapper = shallow(
        <BarChartBaseComponent height={customHeight} width={customWidth} data={mockBarChartData} />
      );
    });

    it('should render two bar series', () => {
      expect(shallowWrapper.find('Chart')).toHaveLength(1);
    });
  });

  describe('render with customized configs', () => {
    const mockNumberFormatter = jest.fn();
    const configs = {
      series: {
        xScaleType: ScaleType.Ordinal,
        yScaleType: ScaleType.Linear,
      },
      axis: {
        yTickFormatter: mockNumberFormatter,
      },
    };

    beforeAll(() => {
      shallowWrapper = shallow(
        <BarChartBaseComponent
          height={customHeight}
          width={customWidth}
          data={mockBarChartData}
          configs={configs}
        />
      );
    });

    it(`should ${mockBarChartData.length} render BarSeries`, () => {
      expect(shallow).toMatchSnapshot();
      expect(shallowWrapper.find(BarSeries)).toHaveLength(mockBarChartData.length);
    });

    it('should render BarSeries with given xScaleType', () => {
      expect(
        shallowWrapper
          .find(BarSeries)
          .first()
          .prop('xScaleType')
      ).toEqual(configs.series.xScaleType);
    });

    it('should render BarSeries with given yScaleType', () => {
      expect(
        shallowWrapper
          .find(BarSeries)
          .first()
          .prop('yScaleType')
      ).toEqual(configs.series.yScaleType);
    });

    it('should render xAxis with given tick formatter', () => {
      expect(
        shallowWrapper
          .find(Axis)
          .first()
          .prop('tickFormat')
      ).toBeUndefined();
    });

    it('should render yAxis with given tick formatter', () => {
      expect(
        shallowWrapper
          .find(Axis)
          .last()
          .prop('tickFormat')
      ).toEqual(mockNumberFormatter);
    });
  });

  describe('render with default configs if no customized configs given', () => {
    beforeAll(() => {
      shallowWrapper = shallow(
        <BarChartBaseComponent height={customHeight} width={customWidth} data={mockBarChartData} />
      );
    });

    it(`should ${mockBarChartData.length} render BarSeries`, () => {
      expect(shallow).toMatchSnapshot();
      expect(shallowWrapper.find(BarSeries)).toHaveLength(mockBarChartData.length);
    });

    it('should render BarSeries with default xScaleType: Linear', () => {
      expect(
        shallowWrapper
          .find(BarSeries)
          .first()
          .prop('xScaleType')
      ).toEqual(ScaleType.Linear);
    });

    it('should render BarSeries with default yScaleType: Linear', () => {
      expect(
        shallowWrapper
          .find(BarSeries)
          .first()
          .prop('yScaleType')
      ).toEqual(ScaleType.Linear);
    });

    it('should not format xTicks value', () => {
      expect(
        shallowWrapper
          .find(Axis)
          .last()
          .prop('tickFormat')
      ).toBeUndefined();
    });

    it('should not format yTicks value', () => {
      expect(
        shallowWrapper
          .find(Axis)
          .last()
          .prop('tickFormat')
      ).toBeUndefined();
    });
  });

  describe('no render', () => {
    beforeAll(() => {
      shallowWrapper = shallow(
        <BarChartBaseComponent height={null} width={null} data={mockBarChartData} />
      );
    });

    it('should not render without height and width', () => {
      expect(shallowWrapper.find('Chart')).toHaveLength(0);
    });
  });
});

describe.each([
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: '' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: '' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 0, x: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
])('BarChartWithCustomPrompt', mockBarChartData => {
  let shallowWrapper: ShallowWrapper;
  describe('renders barchart', () => {
    beforeAll(() => {
      shallowWrapper = shallow(
        <BarChartWithCustomPrompt
          height={customHeight}
          width={customWidth}
          data={mockBarChartData}
        />
      );
    });

    it('render BarChartBaseComponent', () => {
      expect(shallowWrapper.find(BarChartBaseComponent)).toHaveLength(1);
      expect(shallowWrapper.find(ChartHolder)).toHaveLength(0);
    });
  });
});

const table: Array<[ChartSeriesData[] | undefined | null]> = [
  [],
  null,
  [
    [
      { key: 'uniqueSourceIps', color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{}], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{}],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 0, x: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 0, x: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: null, x: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: null, x: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: null, x: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
] as any; // eslint-disable-line @typescript-eslint/no-explicit-any

describe.each(table)('renders prompt', data => {
  let shallowWrapper: ShallowWrapper;
  beforeAll(() => {
    shallowWrapper = shallow(
      <BarChartWithCustomPrompt height={customHeight} width={customWidth} data={data} />
    );
  });

  it('render Chart Holder', () => {
    expect(shallowWrapper.find(BarChartBaseComponent)).toHaveLength(0);
    expect(shallowWrapper.find(ChartHolder)).toHaveLength(1);
  });
});

describe('BarChart', () => {
  let shallowWrapper: ShallowWrapper;
  const mockConfig = {
    series: {
      xScaleType: ScaleType.Time,
      yScaleType: ScaleType.Linear,
      stackAccessors: ['g'],
    },
    axis: {
      xTickFormatter: jest.fn(),
      yTickFormatter: jest.fn(),
      tickSize: 8,
    },
    customHeight: 324,
  };

  it('should render if data exist', () => {
    const mockData = [
      { key: 'uniqueSourceIps', value: [{ y: 100, x: 100, g: 'group' }], color: '#DB1374' },
    ];
    shallowWrapper = shallow(<BarChart configs={mockConfig} barChart={mockData} />);
    expect(shallowWrapper.find('AutoSizer')).toHaveLength(1);
    expect(shallowWrapper.find('ChartHolder')).toHaveLength(0);
  });

  it('should render a chartHolder if no data given', () => {
    const mockData = [{ key: 'uniqueSourceIps', value: [], color: '#DB1374' }];
    shallowWrapper = shallow(<BarChart configs={mockConfig} barChart={mockData} />);
    expect(shallowWrapper.find('AutoSizer')).toHaveLength(0);
    expect(shallowWrapper.find('ChartHolder')).toHaveLength(1);
  });
});
