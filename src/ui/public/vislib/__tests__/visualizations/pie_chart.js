/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import d3 from 'd3';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import fixtures from 'fixtures/fake_hierarchical_data';
import $ from 'jquery';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import { VisProvider } from '../../../vis';
import '../../../persisted_state';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { VislibSlicesResponseHandlerProvider } from '../../../vis/response_handlers/vislib';
import { tabifyAggResponse } from '../../../agg_response/tabify';

const rowAgg = [
  { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
  { type: 'terms', schema: 'split', params: { field: 'extension', rows: true } },
  { type: 'terms', schema: 'segment', params: { field: 'machine.os' } },
  { type: 'terms', schema: 'segment', params: { field: 'geo.src' } }
];

const colAgg = [
  { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
  { type: 'terms', schema: 'split', params: { field: 'extension', row: false } },
  { type: 'terms', schema: 'segment', params: { field: 'machine.os' } },
  { type: 'terms', schema: 'segment', params: { field: 'geo.src' } }
];

const sliceAgg = [
  { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
  { type: 'terms', schema: 'segment', params: { field: 'machine.os' } },
  { type: 'terms', schema: 'segment', params: { field: 'geo.src' } }
];

const aggArray = [
  rowAgg,
  colAgg,
  sliceAgg
];

const names = [
  'rows',
  'columns',
  'slices'
];

const sizes = [
  0,
  5,
  15,
  30,
  60,
  120
];

describe('No global chart settings', function () {
  const visLibParams1 = {
    el: '<div class=chart1></div>',
    type: 'pie',
    addLegend: true,
    addTooltip: true
  };
  const visLibParams2 = {
    el: '<div class=chart2></div>',
    type: 'pie',
    addLegend: true,
    addTooltip: true
  };
  let chart1;
  let chart2;
  let Vis;
  let persistedState;
  let indexPattern;
  let responseHandler;
  let data1;
  let data2;
  let stubVis1;
  let stubVis2;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    chart1 = Private(FixturesVislibVisFixtureProvider)(visLibParams1);
    chart2 = Private(FixturesVislibVisFixtureProvider)(visLibParams2);
    Vis = Private(VisProvider);
    persistedState = new ($injector.get('PersistedState'))();
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    responseHandler = Private(VislibSlicesResponseHandlerProvider).handler;

    let id1 = 1;
    let id2 = 1;
    stubVis1 = new Vis(indexPattern, {
      type: 'pie',
      aggs: rowAgg
    });
    stubVis2 = new Vis(indexPattern, {
      type: 'pie',
      aggs: colAgg
    });

    stubVis1.isHierarchical = () => true;
    stubVis2.isHierarchical = () => true;

    // We need to set the aggs to a known value.
    _.each(stubVis1.aggs, function (agg) {
      agg.id = 'agg_' + id1++;
    });
    _.each(stubVis2.aggs, function (agg) {
      agg.id = 'agg_' + id2++;
    });
  }));

  beforeEach(async () => {
    const table1 = tabifyAggResponse(stubVis1.aggs, fixtures.threeTermBuckets, { metricsAtAllLevels: true });
    const table2 = tabifyAggResponse(stubVis2.aggs, fixtures.threeTermBuckets, { metricsAtAllLevels: true });
    data1 = await responseHandler(table1);
    data2 = await responseHandler(table2);

    chart1.render(data1, persistedState);
    chart2.render(data2, persistedState);
  });

  afterEach(function () {
    chart1.destroy();
    chart2.destroy();
  });

  it('should render chart titles for all charts', function () {
    expect($(chart1.el).find('.y-axis-chart-title').length).to.be(1);
    expect($(chart2.el).find('.x-axis-chart-title').length).to.be(1);
  });

  describe('_validatePieData method', function () {
    const allZeros = [
      { slices: { children: [] } },
      { slices: { children: [] } },
      { slices: { children: [] } }
    ];

    const someZeros = [
      { slices: { children: [{}] } },
      { slices: { children: [{}] } },
      { slices: { children: [] } }
    ];

    const noZeros = [
      { slices: { children: [{}] } },
      { slices: { children: [{}] } },
      { slices: { children: [{}] } }
    ];

    it('should throw an error when all charts contain zeros', function () {
      expect(function () {
        chart1.handler.ChartClass.prototype._validatePieData(allZeros);
      }).to.throwError();
    });

    it('should not throw an error when only some or no charts contain zeros', function () {
      expect(function () {
        chart1.handler.ChartClass.prototype._validatePieData(someZeros);
      }).to.not.throwError();
      expect(function () {
        chart1.handler.ChartClass.prototype._validatePieData(noZeros);
      }).to.not.throwError();
    });
  });
});

describe('Vislib PieChart Class Test Suite', function () {
  aggArray.forEach(function (dataAgg, i) {
    describe('Vislib PieChart Class Test Suite for ' + names[i] + ' data', function () {
      const visLibParams = {
        type: 'pie',
        addLegend: true,
        addTooltip: true
      };
      let vis;
      let Vis;
      let persistedState;
      let indexPattern;
      let data;
      let stubVis;
      let responseHandler;

      beforeEach(ngMock.module('kibana'));
      beforeEach(ngMock.inject(function (Private, $injector) {
        vis = Private(FixturesVislibVisFixtureProvider)(visLibParams);
        Vis = Private(VisProvider);
        persistedState = new ($injector.get('PersistedState'))();
        indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
        responseHandler = Private(VislibSlicesResponseHandlerProvider).handler;

        let id = 1;
        stubVis = new Vis(indexPattern, {
          type: 'pie',
          aggs: dataAgg
        });

        // We need to set the aggs to a known value.
        _.each(stubVis.aggs, function (agg) { agg.id = 'agg_' + id++; });

      }));

      beforeEach(async () => {
        const table = tabifyAggResponse(stubVis.aggs, fixtures.threeTermBuckets, { metricsAtAllLevels: true });
        data = await responseHandler(table);
        vis.render(data, persistedState);
      });

      afterEach(function () {
        vis.destroy();
      });

      describe('addPathEvents method', function () {
        let path;
        let d3selectedPath;
        let onClick;
        let onMouseOver;

        beforeEach(function () {
          vis.handler.charts.forEach(function (chart) {
            path = $(chart.chartEl).find('path')[0];
            d3selectedPath = d3.select(path)[0][0];

            // d3 instance of click and hover
            onClick = (!!d3selectedPath.__onclick);
            onMouseOver = (!!d3selectedPath.__onmouseover);
          });
        });

        it('should attach a click event', function () {
          vis.handler.charts.forEach(function () {
            expect(onClick).to.be(true);
          });
        });

        it('should attach a hover event', function () {
          vis.handler.charts.forEach(function () {
            expect(onMouseOver).to.be(true);
          });
        });
      });

      describe('addPath method', function () {
        let width;
        let height;
        let svg;
        let slices;


        it('should return an SVG object', function () {
          vis.handler.charts.forEach(function (chart) {
            $(chart.chartEl).find('svg').empty();
            width = $(chart.chartEl).width();
            height = $(chart.chartEl).height();
            svg = d3.select($(chart.chartEl).find('svg')[0]);
            slices = chart.chartData.slices;
            expect(_.isObject(chart.addPath(width, height, svg, slices))).to.be(true);
          });

        });

        it('should draw path elements', function () {
          vis.handler.charts.forEach(function (chart) {

            // test whether path elements are drawn
            expect($(chart.chartEl).find('path').length).to.be.greaterThan(0);
          });
        });

        it ('should draw labels', function () {
          vis.handler.charts.forEach(function (chart) {
            $(chart.chartEl).find('svg').empty();
            width = $(chart.chartEl).width();
            height = $(chart.chartEl).height();
            svg = d3.select($(chart.chartEl).find('svg')[0]);
            slices = chart.chartData.slices;
            chart._attr.labels.show = true;
            chart.addPath(width, height, svg, slices);
            expect($(chart.chartEl).find('text.label-text').length).to.be.greaterThan(0);
          });
        });
      });

      describe('draw method', function () {
        it('should return a function', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(_.isFunction(chart.draw())).to.be(true);
          });
        });
      });

      sizes.forEach(function (size) {
        describe('containerTooSmall error', function () {
          it('should throw an error', function () {
            // 20px is the minimum height and width
            vis.handler.charts.forEach(function (chart) {
              $(chart.chartEl).height(size);
              $(chart.chartEl).width(size);

              if (size < 20) {
                expect(function () {
                  chart.render();
                }).to.throwError();
              }
            });
          });

          it('should not throw an error', function () {
            vis.handler.charts.forEach(function (chart) {
              $(chart.chartEl).height(size);
              $(chart.chartEl).width(size);

              if (size > 20) {
                expect(function () {
                  chart.render();
                }).to.not.throwError();
              }
            });
          });
        });
      });

    });
  });
});
