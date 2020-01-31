/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import $ from 'jquery';
import d3 from 'd3';
import expect from '@kbn/expect';
import {
  chartLimits,
  filterAxisLabels,
  getChartType,
  numTicks,
  showMultiBucketAnomalyMarker,
  showMultiBucketAnomalyTooltip,
} from '../chart_utils';
import { MULTI_BUCKET_IMPACT } from '../../../common/constants/multi_bucket_impact';
import { CHART_TYPE } from '../../explorer/explorer_constants';

describe('ML - chart utils', () => {
  describe('chartLimits', () => {
    it('returns NaN when called without data', () => {
      const limits = chartLimits();
      expect(limits.min).to.be.NaN;
      expect(limits.max).to.be.NaN;
    });

    it('returns {max: 625736376, min: 201039318} for some test data', () => {
      const data = [
        {
          date: new Date('2017-02-23T08:00:00.000Z'),
          value: 228243469,
          anomalyScore: 63.32916,
          numberOfCauses: 1,
          actual: [228243469],
          typical: [133107.7703441773],
        },
        { date: new Date('2017-02-23T09:00:00.000Z'), value: null },
        { date: new Date('2017-02-23T10:00:00.000Z'), value: null },
        { date: new Date('2017-02-23T11:00:00.000Z'), value: null },
        {
          date: new Date('2017-02-23T12:00:00.000Z'),
          value: 625736376,
          anomalyScore: 97.32085,
          numberOfCauses: 1,
          actual: [625736376],
          typical: [132830.424736973],
        },
        {
          date: new Date('2017-02-23T13:00:00.000Z'),
          value: 201039318,
          anomalyScore: 59.83488,
          numberOfCauses: 1,
          actual: [201039318],
          typical: [132739.5267403542],
        },
      ];

      const limits = chartLimits(data);

      // {max: 625736376, min: 201039318}
      expect(limits.min).to.be(201039318);
      expect(limits.max).to.be(625736376);
    });

    it("adds 5% padding when min/max are the same, e.g. when there's only one data point", () => {
      const data = [
        {
          date: new Date('2017-02-23T08:00:00.000Z'),
          value: 100,
          anomalyScore: 50,
          numberOfCauses: 1,
          actual: [100],
          typical: [100],
        },
      ];

      const limits = chartLimits(data);
      expect(limits.min).to.be(95);
      expect(limits.max).to.be(105);
    });

    it('returns minimum of 0 when data includes an anomaly for missing data', () => {
      const data = [
        { date: new Date('2017-02-23T09:00:00.000Z'), value: 22.2 },
        { date: new Date('2017-02-23T10:00:00.000Z'), value: 23.3 },
        { date: new Date('2017-02-23T11:00:00.000Z'), value: 24.4 },
        {
          date: new Date('2017-02-23T12:00:00.000Z'),
          value: null,
          anomalyScore: 97.32085,
          actual: [0],
          typical: [22.2],
        },
        { date: new Date('2017-02-23T13:00:00.000Z'), value: 21.3 },
        { date: new Date('2017-02-23T14:00:00.000Z'), value: 21.2 },
        { date: new Date('2017-02-23T15:00:00.000Z'), value: 21.1 },
      ];

      const limits = chartLimits(data);
      expect(limits.min).to.be(0);
      expect(limits.max).to.be(24.4);
    });
  });

  describe('filterAxisLabels', () => {
    it('throws an error when called without arguments', () => {
      expect(() => filterAxisLabels()).to.throwError();
    });

    it('filters axis labels', () => {
      // this provides a dummy structure of axis labels.
      // the first one should always be filtered because it overflows on the
      // left side of the axis. the last one should be filtered based on the
      // given width parameter when doing the test calls.
      $('body').append(`
        <svg id="filterAxisLabels">
          <g class="x axis">
            <g class="tick" transform="translate(5,0)">
              <text dy=".71em" y="10" x="0" style="text-anchor: middle;">06:00</text>
            </g>
            <g class="tick" transform="translate(187.24137931034485,0)">
              <text dy=".71em" y="10" x="0" style="text-anchor: middle;">12:00</text>
            </g>
            <g class="tick" transform="translate(486.82758620689657,0)">
              <text dy=".71em" y="10" x="0" style="text-anchor: middle;">18:00</text>
            </g>
            <g class="tick" transform="translate(786.4137931034483,0)">
              <text dy=".71em" y="10" x="0" style="text-anchor: middle;">00:00</text>
            </g>
          </g>
        </svg>
      `);

      const selector = '#filterAxisLabels .x.axis';

      // given this width, the last tick should not be removed
      filterAxisLabels(d3.selectAll(selector), 1000);
      expect(d3.selectAll(selector + ' .tick text').size()).to.be(3);

      // given this width, the last tick should be removed
      filterAxisLabels(d3.selectAll(selector), 790);
      expect(d3.selectAll(selector + ' .tick text').size()).to.be(2);

      // clean up
      $('#filterAxisLabels').remove();
    });
  });

  describe('getChartType', () => {
    const singleMetricConfig = {
      metricFunction: 'avg',
      functionDescription: 'mean',
      fieldName: 'responsetime',
      entityFields: [],
    };

    const multiMetricConfig = {
      metricFunction: 'avg',
      functionDescription: 'mean',
      fieldName: 'responsetime',
      entityFields: [
        {
          fieldName: 'airline',
          fieldValue: 'AAL',
          fieldType: 'partition',
        },
      ],
    };

    const populationConfig = {
      metricFunction: 'avg',
      functionDescription: 'mean',
      fieldName: 'http.response.body.bytes',
      entityFields: [
        {
          fieldName: 'source.ip',
          fieldValue: '10.11.12.13',
          fieldType: 'over',
        },
      ],
    };

    const rareConfig = {
      metricFunction: 'count',
      functionDescription: 'rare',
      entityFields: [
        {
          fieldName: 'http.response.status_code',
          fieldValue: '404',
          fieldType: 'by',
        },
      ],
    };

    const varpModelPlotConfig = {
      metricFunction: null,
      functionDescription: 'varp',
      fieldName: 'NetworkOut',
      entityFields: [
        {
          fieldName: 'instance',
          fieldValue: 'i-ef74d410',
          fieldType: 'over',
        },
      ],
    };

    const overScriptFieldModelPlotConfig = {
      metricFunction: 'count',
      functionDescription: 'count',
      fieldName: 'highest_registered_domain',
      entityFields: [
        {
          fieldName: 'highest_registered_domain',
          fieldValue: 'elastic.co',
          fieldType: 'over',
        },
      ],
      datafeedConfig: {
        script_fields: {
          highest_registered_domain: {
            script: {
              source: "return domainSplit(doc['query'].value, params).get(1);",
              lang: 'painless',
            },
            ignore_failure: false,
          },
        },
      },
    };

    it('returns single metric chart type as expected for configs', () => {
      expect(getChartType(singleMetricConfig)).to.be(CHART_TYPE.SINGLE_METRIC);
      expect(getChartType(multiMetricConfig)).to.be(CHART_TYPE.SINGLE_METRIC);
      expect(getChartType(varpModelPlotConfig)).to.be(CHART_TYPE.SINGLE_METRIC);
      expect(getChartType(overScriptFieldModelPlotConfig)).to.be(CHART_TYPE.SINGLE_METRIC);
    });

    it('returns event distribution chart type as expected for configs', () => {
      expect(getChartType(rareConfig)).to.be(CHART_TYPE.EVENT_DISTRIBUTION);
    });

    it('returns population distribution chart type as expected for configs', () => {
      expect(getChartType(populationConfig)).to.be(CHART_TYPE.POPULATION_DISTRIBUTION);
    });
  });

  describe('numTicks', () => {
    it('returns 10 for 1000', () => {
      expect(numTicks(1000)).to.be(10);
    });
  });

  describe('showMultiBucketAnomalyMarker', () => {
    it('returns true for points with multiBucketImpact at or above medium impact', () => {
      expect(showMultiBucketAnomalyMarker({ multiBucketImpact: MULTI_BUCKET_IMPACT.HIGH })).to.be(
        true
      );
      expect(showMultiBucketAnomalyMarker({ multiBucketImpact: MULTI_BUCKET_IMPACT.MEDIUM })).to.be(
        true
      );
    });

    it('returns false for points with multiBucketImpact missing or below medium impact', () => {
      expect(showMultiBucketAnomalyMarker({})).to.be(false);
      expect(showMultiBucketAnomalyMarker({ multiBucketImpact: MULTI_BUCKET_IMPACT.LOW })).to.be(
        false
      );
      expect(showMultiBucketAnomalyMarker({ multiBucketImpact: MULTI_BUCKET_IMPACT.NONE })).to.be(
        false
      );
    });
  });

  describe('showMultiBucketAnomalyTooltip', () => {
    it('returns true for points with multiBucketImpact at or above low impact', () => {
      expect(showMultiBucketAnomalyTooltip({ multiBucketImpact: MULTI_BUCKET_IMPACT.HIGH })).to.be(
        true
      );
      expect(
        showMultiBucketAnomalyTooltip({ multiBucketImpact: MULTI_BUCKET_IMPACT.MEDIUM })
      ).to.be(true);
      expect(showMultiBucketAnomalyTooltip({ multiBucketImpact: MULTI_BUCKET_IMPACT.LOW })).to.be(
        true
      );
    });

    it('returns false for points with multiBucketImpact missing or below medium impact', () => {
      expect(showMultiBucketAnomalyTooltip({})).to.be(false);
      expect(showMultiBucketAnomalyTooltip({ multiBucketImpact: MULTI_BUCKET_IMPACT.NONE })).to.be(
        false
      );
    });
  });
});
