/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { plot } from '../plot';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testPlot } from './fixtures/test_pointseries';
import {
  fontStyle,
  grayscalePalette,
  gradientPalette,
  yAxisConfig,
  xAxisConfig,
  seriesStyle,
  defaultStyle,
} from './fixtures/test_styles';

describe('plot', () => {
  const fn = functionWrapper(plot);

  it('returns a render as plot', () => {
    const result = fn(testPlot);
    expect(result, () => {})
      .to.have.property('type', 'render')
      .and.to.have.property('as', 'plot');
  });

  describe('data', () => {
    const result = fn(testPlot).value.data;
    it('is sorted by the series labels', () => {
      expect(result.every((val, i) => (!!i ? val.label >= result[i - 1].label : true))).to.be(true);
    });

    it('has one series per unique label', () => {
      const uniqueLabels = testPlot.rows
        .reduce(
          (unique, series) =>
            !unique.includes(series.color) ? unique.concat([series.color]) : unique,
          []
        )
        .sort();

      expect(result).to.have.length(uniqueLabels.length);
      expect(result.every((series, i) => series.label === uniqueLabels[i])).to.be(true);
    });

    it('populates the data of the plot with points from the pointseries', () => {
      expect(result[0].data).to.eql([
        [1517842800950, 605, { size: 100, text: 605 }],
        [1517929200950, 583, { size: 200, text: 583 }],
      ]);

      expect(result[1].data).to.eql([
        [1517842800950, 216, { size: 350, text: 216 }],
        [1517929200950, 200, { size: 256, text: 200 }],
      ]);

      expect(result[2].data).to.eql([[1517842800950, 67, { size: 240, text: 67 }]]);

      expect(result[3].data).to.eql([[1517842800950, 311, { size: 447, text: 311 }]]);
    });
  });

  describe('args', () => {
    describe('seriesStyle', () => {
      it('sets the seriesStyle for a specific series', () => {
        const result = fn(testPlot, { seriesStyle: [seriesStyle] }).value;
        const seriesIndex = result.data.findIndex(series => series.label === seriesStyle.label);
        const resultSeries = result.data[seriesIndex];

        expect(resultSeries.lines)
          .to.have.property('lineWidth', seriesStyle.lines)
          .and.to.have.property('show', false)
          .and.to.have.property('fillColor', seriesStyle.color)
          .and.to.have.property('fill', seriesStyle.fill / 10);

        expect(resultSeries.bars)
          .to.have.property('show', false)
          .and.to.have.property('barWidth', seriesStyle.bars)
          .and.to.have.property('horizontal', seriesStyle.horizontalBars);

        expect(resultSeries.bubbles).to.have.property('fill', seriesStyle.fill);

        expect(resultSeries)
          .to.have.property('stack', seriesStyle.stack)
          .and.to.have.property('color', seriesStyle.color);
      });
    });

    describe('defaultStyle', () => {
      it('sets the default seriesStyle for the entire plot', () => {
        const results = fn(testPlot, { defaultStyle: defaultStyle });
        const defaultSeriesConfig = results.value.options.series;

        expect(defaultSeriesConfig.lines)
          .to.have.property('lineWidth', defaultStyle.lines)
          .and.to.have.property('show', false)
          .and.to.have.property('fillColor', defaultStyle.color)
          .and.to.have.property('fill', defaultStyle.fill / 10);

        expect(defaultSeriesConfig.bars)
          .to.have.property('show', false)
          .and.to.have.property('barWidth', defaultStyle.bars)
          .and.to.have.property('horizontal', defaultStyle.horizontalBars);

        expect(defaultSeriesConfig.bubbles).to.have.property('fill', defaultStyle.fill);

        expect(defaultSeriesConfig)
          .to.not.have.property('stack')
          .and.to.not.have.property('color');
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{seriesStyle points=5}'", () => {});
    });

    describe('palette', () => {
      it('sets the color palette', () => {
        const result = fn(testPlot, { palette: grayscalePalette }).value.options;
        expect(result).to.have.property('colors');
        expect(result.colors).to.eql(grayscalePalette.colors);
      });

      it('creates a new set of colors from a color scale when gradient is true', () => {
        const result = fn(testPlot, { palette: gradientPalette }).value.options;
        expect(result).to.have.property('colors');
        expect(result.colors).to.eql(['#ffffff', '#aaaaaa', '#555555', '#000000']);
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{palette}'", () => {});
    });

    describe('font', () => {
      it('sets the font style', () => {
        const result = fn(testPlot, { font: fontStyle }).value;
        const style = {
          size: 14,
          lHeight: 21,
          style: 'normal',
          weight: 'bolder',
          family: 'Chalkboard, serif',
          color: 'pink',
        };
        expect(result.options.xaxis.font).to.eql(style);
        expect(result.options.yaxis.font).to.eql(style);
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{font}'", () => {});
    });

    describe('legend', () => {
      it('hides the legend', () => {
        const result = fn(testPlot, { legend: false }).value.options;
        expect(result.legend)
          .to.only.have.key('show')
          .and.to.have.property('show', false);
      });

      it('sets the position of the legend', () => {
        let result = fn(testPlot, { legend: 'nw' }).value.options;
        expect(result.legend).to.have.property('position', 'nw');

        result = fn(testPlot, { legend: 'ne' }).value.options;
        expect(result.legend).to.have.property('position', 'ne');

        result = fn(testPlot, { legend: 'sw' }).value.options;
        expect(result.legend).to.have.property('position', 'sw');

        result = fn(testPlot, { legend: 'se' }).value.options;
        expect(result.legend).to.have.property('position', 'se');
      });

      it("defaults to 'ne' if invalid position is provided", () => {
        let result = fn(testPlot).value.options;
        expect(result.legend).to.have.property('position', 'ne');

        result = fn(testPlot, { legend: true }).value.options;
        expect(result.legend).to.have.property('position', 'ne');

        result = fn(testPlot, { legend: 'foo' }).value.options;
        expect(result.legend).to.have.property('position', 'ne');
      });
    });

    describe('yaxis', () => {
      it('sets visibility of the y-axis labels', () => {
        let result = fn(testPlot, { yaxis: true }).value.options;
        expect(result.yaxis).to.have.property('show', true);

        result = fn(testPlot, { yaxis: false }).value.options;
        expect(result.yaxis).to.have.property('show', false);
      });

      it('configures the y-axis with an AxisConfig', () => {
        const result = fn(testPlot, { yaxis: yAxisConfig }).value.options;
        expect(result.yaxis)
          .to.have.property('show', true)
          .and.to.have.property('position', 'right');
      });

      it("defaults to 'true' if not provided", () => {
        const result = fn(testPlot).value.options;
        expect(result.yaxis).to.have.property('show', true);
      });
    });

    describe('xaxis', () => {
      it('sets visibility of the x-axis labels', () => {
        let result = fn(testPlot, { xaxis: true }).value.options;
        expect(result.xaxis).to.have.property('show', true);

        result = fn(testPlot, { xaxis: false }).value.options;
        expect(result.xaxis).to.have.property('show', false);
      });

      it('configures the x-axis with an AxisConfig', () => {
        const result = fn(testPlot, { xaxis: xAxisConfig }).value.options;
        expect(result.xaxis)
          .to.have.property('show', true)
          .and.to.have.property('position', 'top');
      });

      it("defaults to 'true' if not provided", () => {
        const result = fn(testPlot).value.options;
        expect(result.xaxis).to.have.property('show', true);
      });
    });
  });
});
