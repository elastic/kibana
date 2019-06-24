/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ShallowWrapper, shallow } from 'enzyme';
import * as React from 'react';

import { AreaChartBaseComponent, AreaChartWithCustomPrompt } from './areachart';
import { ChartConfigsData, ChartHolder } from './common';
import { ScaleType, AreaSeries, Axis } from '@elastic/charts';

jest.mock('@elastic/charts');

describe('AreaChartBaseComponent', () => {
  let shallowWrapper: ShallowWrapper;
  const mockAreaChartData: ChartConfigsData[] = [
    {
      key: 'uniqueSourceIpsHistogram',
      value: [
        { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 580213 },
        { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1096175 },
        { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12382 },
      ],
      color: '#DB1374',
    },
    {
      key: 'uniqueDestinationIpsHistogram',
      value: [
        { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
        { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
        { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
      ],
      color: '#490092',
    },
  ];

  describe('render', () => {
    beforeAll(() => {
      shallowWrapper = shallow(
        <AreaChartBaseComponent height={100} width={120} data={mockAreaChartData} />
      );
    });

    it('should render Chart', () => {
      expect(shallowWrapper.find('Chart')).toHaveLength(1);
    });
  });

  describe('render with customized configs', () => {
    const mockTimeFormatter = jest.fn();
    const mockNumberFormatter = jest.fn();
    const configs = {
      series: {
        xScaleType: ScaleType.Time,
        yScaleType: ScaleType.Linear,
      },
      axis: {
        xTickFormatter: mockTimeFormatter,
        yTickFormatter: mockNumberFormatter,
      },
    };

    beforeAll(() => {
      shallowWrapper = shallow(
        <AreaChartBaseComponent
          height={100}
          width={120}
          data={mockAreaChartData}
          configs={configs}
        />
      );
    });

    it(`should ${mockAreaChartData.length} render AreaSeries`, () => {
      expect(shallow).toMatchSnapshot();
      expect(shallowWrapper.find(AreaSeries)).toHaveLength(mockAreaChartData.length);
    });

    it('should render AreaSeries with given xScaleType', () => {
      expect(
        shallowWrapper
          .find(AreaSeries)
          .first()
          .prop('xScaleType')
      ).toEqual(configs.series.xScaleType);
    });

    it('should render AreaSeries with given yScaleType', () => {
      expect(
        shallowWrapper
          .find(AreaSeries)
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
      ).toEqual(mockTimeFormatter);
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
        <AreaChartBaseComponent height={100} width={120} data={mockAreaChartData} />
      );
    });

    it(`should ${mockAreaChartData.length} render AreaSeries`, () => {
      expect(shallow).toMatchSnapshot();
      expect(shallowWrapper.find(AreaSeries)).toHaveLength(mockAreaChartData.length);
    });

    it('should render AreaSeries with default xScaleType: Linear', () => {
      expect(
        shallowWrapper
          .find(AreaSeries)
          .first()
          .prop('xScaleType')
      ).toEqual(ScaleType.Linear);
    });

    it('should render AreaSeries with default yScaleType: Linear', () => {
      expect(
        shallowWrapper
          .find(AreaSeries)
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
        <AreaChartBaseComponent height={null} width={null} data={mockAreaChartData} />
      );
    });

    it('should not render without height and width', () => {
      expect(shallowWrapper.find('Chart')).toHaveLength(0);
    });
  });
});

describe('AreaChartWithCustomPrompt', () => {
  let shallowWrapper: ShallowWrapper;
  describe.each([
    [
      [
        {
          key: 'uniqueSourceIpsHistogram',
          value: [
            { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 580213 },
            { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1096175 },
            { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12382 },
          ],
          color: '#DB1374',
        },
        {
          key: 'uniqueDestinationIpsHistogram',
          value: [
            { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
            { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
            { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
          ],
          color: '#490092',
        },
      ],
      [
        [
          {
            key: 'uniqueSourceIpsHistogram',
            value: [],
            color: '#DB1374',
          },
          {
            key: 'uniqueDestinationIpsHistogram',
            value: [
              { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
              { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
              { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
            ],
            color: '#490092',
          },
        ],
      ],
    ],
  ])('renders areachart', (data: ChartConfigsData[] | [] | null | undefined) => {
    beforeAll(() => {
      shallowWrapper = shallow(<AreaChartWithCustomPrompt height={100} width={120} data={data} />);
    });

    it('render AreaChartBaseComponent', () => {
      expect(shallowWrapper.find(AreaChartBaseComponent)).toHaveLength(1);
      expect(shallowWrapper.find(ChartHolder)).toHaveLength(0);
    });
  });

  describe.each([
    null,
    [],
    [
      {
        key: 'uniqueSourceIpsHistogram',
        value: null,
        color: '#DB1374',
      },
      {
        key: 'uniqueDestinationIpsHistogram',
        value: null,
        color: '#490092',
      },
    ],
    [
      {
        key: 'uniqueSourceIpsHistogram',
        value: [
          { x: new Date('2019-05-03T13:00:00.000Z').valueOf() },
          { x: new Date('2019-05-04T01:00:00.000Z').valueOf() },
          { x: new Date('2019-05-04T13:00:00.000Z').valueOf() },
        ],
        color: '#DB1374',
      },
      {
        key: 'uniqueDestinationIpsHistogram',
        value: [
          { x: new Date('2019-05-03T13:00:00.000Z').valueOf() },
          { x: new Date('2019-05-04T01:00:00.000Z').valueOf() },
          { x: new Date('2019-05-04T13:00:00.000Z').valueOf() },
        ],
        color: '#490092',
      },
    ],
    [
      [
        {
          key: 'uniqueSourceIpsHistogram',
          value: [
            { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 580213 },
            { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: null },
            { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12382 },
          ],
          color: '#DB1374',
        },
        {
          key: 'uniqueDestinationIpsHistogram',
          value: [
            { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
            { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
            { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
          ],
          color: '#490092',
        },
      ],
    ],
    [
      [
        {
          key: 'uniqueSourceIpsHistogram',
          value: [
            { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 580213 },
            { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: {} },
            { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12382 },
          ],
          color: '#DB1374',
        },
        {
          key: 'uniqueDestinationIpsHistogram',
          value: [
            { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
            { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
            { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
          ],
          color: '#490092',
        },
      ],
    ],
  ])('renders prompt', (data: ChartConfigsData[] | [] | null | undefined) => {
    beforeAll(() => {
      shallowWrapper = shallow(<AreaChartWithCustomPrompt height={100} width={120} data={data} />);
    });

    it('render Chart Holder', () => {
      expect(shallowWrapper.find(AreaChartBaseComponent)).toHaveLength(0);
      expect(shallowWrapper.find(ChartHolder)).toHaveLength(1);
    });
  });
});
