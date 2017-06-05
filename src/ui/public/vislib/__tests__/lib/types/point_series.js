import ngMock from 'ng_mock';
import expect from 'expect.js';
import stackedSeries from 'fixtures/vislib/mock_data/date_histogram/_stacked_series';
import { VislibTypesPointSeries } from 'ui/vislib/lib/types/point_series';

describe('Point Series Config Type Class Test Suite', function () {
  let pointSeriesConfig;
  let parsedConfig;
  const histogramConfig = {
    type: 'histogram',
    addLegend: true,
    addTooltip: true,
  };

  const heatmapConfig = {
    type: 'heatmap',
    addLegend: true,
    addTooltip: true,
    colorsNumber: 4,
    colorSchema: 'Greens',
    setColorRange: false,
    percentageMode: true,
    invertColors: false,
    colorsRange: []
  };

  const data = {
    get: (prop) => { return data[prop] || null; },
    getLabels: () => [],
    data: {
      hits: 621,
      ordered: {
        date: true,
        interval: 30000,
        max: 1408734982458,
        min: 1408734082458
      },
      series: [
        { label: 's1', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's2', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's3', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's4', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's5', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's6', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's7', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's8', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's9', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's10', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's11', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's12', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's13', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's14', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's15', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's16', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's17', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's18', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's19', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's20', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's21', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's22', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's23', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's24', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's25', values: [{ x: 1408734060000, y: 8 }] },
        { label: 's26', values: [{ x: 1408734060000, y: 8 }] }
      ],
      xAxisLabel: 'Date Histogram',
      yAxisLabel: 'series'
    }

  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    pointSeriesConfig = Private(VislibTypesPointSeries);
  }));

  describe('histogram chart', function () {
    beforeEach(function () {
      parsedConfig = pointSeriesConfig.heatmap(histogramConfig, data);
    });
    it('should not throw an error when more than 25 series are provided', function () {
      expect(parsedConfig.error).to.be.undefined;
    });
  });


  describe('heatmap chart', function () {
    beforeEach(function () {
      const stackedData = {
        get: (prop) => { return data[prop] || null; },
        getLabels: () => [],
        data: stackedSeries
      };
      parsedConfig = pointSeriesConfig.heatmap(heatmapConfig, stackedData);
    });

    it('should throw an error when more than 25 series are provided', function () {
      parsedConfig = pointSeriesConfig.heatmap(heatmapConfig, data);
      expect(parsedConfig.error).to.be('There are too many series defined.');
    });

    it('should not throw an error when less than 25 series are provided', function () {
      expect(parsedConfig.error).to.be.undefined;
    });

    it('should hide first value axis', function () {
      expect(parsedConfig.valueAxes[0].show).to.be(false);
    });

    it('should add second value axis', function () {
      expect(parsedConfig.valueAxes.length).to.equal(2);
    });
  });
});
