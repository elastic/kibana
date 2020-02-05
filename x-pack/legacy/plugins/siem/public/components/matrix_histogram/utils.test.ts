/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getBarchartConfigs,
  DEFAULT_CHART_HEIGHT,
  DEFAULT_Y_TICK_FORMATTER,
  formatToChartDataItem,
  getCustomChartData,
} from './utils';
import { UpdateDateRange } from '../charts/common';
import { Position, ScaleType, TickFormatter } from '@elastic/charts';
import { MatrixOverTimeHistogramData } from '../../graphql/types';

describe('utils', () => {
  describe('getBarchartConfigs', () => {
    interface BarchartConfigs {
      series: {
        xScaleType: ScaleType;
        yScaleType: ScaleType;
        stackAccessors: string[];
      };
      axis: {
        xTickFormatter: TickFormatter;
        yTickFormatter: TickFormatter;
        tickSize: number;
      };
      settings: {
        legendPosition: Position;
        onBrushEnd: UpdateDateRange;
        showLegend: boolean;
        theme: {
          scales: {
            barsPadding: number;
          };
          chartMargins: {
            left: number;
            right: number;
            top: number;
            bottom: number;
          };
          chartPaddings: {
            left: number;
            right: number;
            top: number;
            bottom: number;
          };
        };
      };
      customHeight: number;
    }
    describe('it should get correct default values', () => {
      let configs: BarchartConfigs;
      beforeAll(() => {
        configs = getBarchartConfigs({
          from: 0,
          to: 0,
          onBrushEnd: jest.fn() as UpdateDateRange,
        });
      });

      test('it should set default chartHeight', () => {
        expect(configs.customHeight).toEqual(DEFAULT_CHART_HEIGHT);
      });

      test('it should show legend by default', () => {
        expect(configs.settings.showLegend).toEqual(true);
      });

      test('it should put legend at the bottom', () => {
        expect(configs.settings.legendPosition).toEqual(Position.Bottom);
      });

      test('it should format Y tick to local string', () => {
        expect(configs.axis.yTickFormatter).toEqual(DEFAULT_Y_TICK_FORMATTER);
      });
    });

    describe('it should set custom configs', () => {
      let configs: BarchartConfigs;
      const mockYTickFormatter = jest.fn();
      const mockChartHeight = 100;

      beforeAll(() => {
        configs = getBarchartConfigs({
          chartHeight: mockChartHeight,
          from: 0,
          to: 0,
          onBrushEnd: jest.fn() as UpdateDateRange,
          yTickFormatter: mockYTickFormatter,
          showLegend: false,
        });
      });

      test('it should set custom chart height', () => {
        expect(configs.customHeight).toEqual(mockChartHeight);
      });

      test('it should hide legend', () => {
        expect(configs.settings.showLegend).toEqual(false);
      });

      test('it should format y tick with custom formatter', () => {
        expect(configs.axis.yTickFormatter).toEqual(mockYTickFormatter);
      });
    });
  });

  describe('formatToChartDataItem', () => {
    test('it should format data correctly', () => {
      const data: [string, MatrixOverTimeHistogramData[]] = [
        'g1',
        [
          { x: 1, y: 2, g: 'g1' },
          { x: 2, y: 4, g: 'g1' },
          { x: 3, y: 6, g: 'g1' },
        ],
      ];
      const result = formatToChartDataItem(data);
      expect(result).toEqual({
        key: 'g1',
        value: [
          { x: 1, y: 2, g: 'g1' },
          { x: 2, y: 4, g: 'g1' },
          { x: 3, y: 6, g: 'g1' },
        ],
      });
    });
  });

  describe('getCustomChartData', () => {
    test('should handle the case when no data provided', () => {
      const data = null;
      const result = getCustomChartData(data);

      expect(result).toEqual([]);
    });

    test('shoule format data correctly', () => {
      const data = [
        { x: 1, y: 2, g: 'g1' },
        { x: 2, y: 4, g: 'g1' },
        { x: 3, y: 6, g: 'g1' },
        { x: 1, y: 1, g: 'g2' },
        { x: 2, y: 3, g: 'g2' },
        { x: 3, y: 5, g: 'g2' },
      ];
      const result = getCustomChartData(data);

      expect(result).toEqual([
        {
          key: 'g1',
          value: [
            { x: 1, y: 2, g: 'g1' },
            { x: 2, y: 4, g: 'g1' },
            { x: 3, y: 6, g: 'g1' },
          ],
        },
        {
          key: 'g2',
          value: [
            { x: 1, y: 1, g: 'g2' },
            { x: 2, y: 3, g: 'g2' },
            { x: 3, y: 5, g: 'g2' },
          ],
        },
      ]);
    });
  });
});
