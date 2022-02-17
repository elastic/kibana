/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { Datatable } from 'src/plugins/expressions';
import { ExpectExpression, expectExpressionProvider } from './helpers';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

function getCell(esaggsResult: any, row: number, column: number): unknown | undefined {
  if (esaggsResult && !esaggsResult.columns) {
    throw new Error(`Unexpected esaggs result: ${JSON.stringify(esaggsResult, undefined, ' ')}`);
  }

  const columnId = esaggsResult?.columns[column]?.id;
  if (!columnId) {
    return;
  }
  return esaggsResult?.rows[row]?.[columnId];
}

function checkShift(rows: Datatable['rows'], columns: Datatable['columns'], metricIndex = 1) {
  rows.shift();
  rows.pop();
  function getValue(row: number, column: number) {
    return getCell({ rows, columns }, row, column);
  }
  // check whether there is actual data in the table
  if (
    rows.every((_, index) => !getValue(index, metricIndex) && !getValue(index, metricIndex + 1))
  ) {
    throw new Error('all cell contents falsy');
  }
  rows.forEach((_, index) => {
    if (index < rows.length - 1) {
      expect(getCell({ rows, columns }, index, metricIndex + 1)).to.be(
        getCell({ rows, columns }, index + 1, metricIndex)
      );
    }
  });
}

export default function ({
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  let expectExpression: ExpectExpression;

  describe('esaggs timeshift tests', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    const timeRange = {
      from: '2015-09-21T00:00:00Z',
      to: '2015-09-22T00:00:00Z',
    };

    it('shifts single metric', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggCount id="1" enabled=true schema="metric" timeShift="1d"}
        `;
      const result = await expectExpression('esaggs_shift_single_metric', expression).getResponse();
      expect(getCell(result, 0, 0)).to.be(4763);
    });

    it('shifts multiple metrics', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggCount id="1" enabled=true schema="metric" timeShift="12h"}
          aggs={aggCount id="2" enabled=true schema="metric" timeShift="1d"}
          aggs={aggCount id="3" enabled=true schema="metric"}
        `;
      const result = await expectExpression('esaggs_shift_multi_metric', expression).getResponse();
      expect(getCell(result, 0, 0)).to.be(4629);
      expect(getCell(result, 0, 1)).to.be(4763);
      expect(getCell(result, 0, 2)).to.be(4618);
    });

    it('shifts multiple metrics with relative time range and previous', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='now'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggCount id="1" enabled=true schema="metric"}
          aggs={aggCount id="2" enabled=true schema="metric" timeShift="previous"}
        `;
      const result = await expectExpression(
        'esaggs_shift_multi_metric_previous',
        expression
      ).getResponse();
      expect(getCell(result, 0, 0)).to.be(9247);
      expect(getCell(result, 0, 1)).to.be(4763);
    });

    it('shifts single percentile', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggSinglePercentile id="1" enabled=true schema="metric" field="bytes" percentile=95}
          aggs={aggSinglePercentile id="2" enabled=true schema="metric" field="bytes" percentile=95 timeShift="1d"}
        `;
      const result = await expectExpression(
        'esaggs_shift_single_percentile',
        expression
      ).getResponse();

      // percentile is not stable
      expect(getCell(result, 0, 0)).to.be.within(10000, 20000);
      expect(getCell(result, 0, 1)).to.be.within(10000, 20000);
    });

    it('shifts multiple percentiles', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggPercentiles id="1" enabled=true schema="metric" field="bytes" percents=5 percents=95}
          aggs={aggPercentiles id="2" enabled=true schema="metric" field="bytes" percents=5 percents=95 timeShift="1d"}
        `;
      const result = await expectExpression(
        'esaggs_shift_multi_percentile',
        expression
      ).getResponse();
      // percentile is not stable
      expect(getCell(result, 0, 0)).to.be.within(100, 1000);
      expect(getCell(result, 0, 1)).to.be.within(10000, 20000);
      expect(getCell(result, 0, 2)).to.be.within(100, 1000);
      expect(getCell(result, 0, 3)).to.be.within(10000, 20000);
    });

    it('shifts date histogram', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggDateHistogram id="1" enabled=true schema="bucket" field="@timestamp" interval="1h"}
          aggs={aggAvg id="2" field="bytes" enabled=true schema="metric" timeShift="1h"}
          aggs={aggAvg id="3" field="bytes" enabled=true schema="metric"}
        `;
      const result: Datatable = await expectExpression(
        'esaggs_shift_date_histogram',
        expression
      ).getResponse();
      expect(result.rows.length).to.be(25);
      checkShift(result.rows, result.columns);
    });

    it('shifts correctly even if one id is the prefix of another', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggDateHistogram id="prefix" enabled=true schema="bucket" field="@timestamp" interval="1h"}
          aggs={aggAvg id="prefix-prefix" field="bytes" enabled=true schema="metric" timeShift="1h"}
          aggs={aggAvg id="prefix-prefix-prefix" field="bytes" enabled=true schema="metric"}
        `;
      const result: Datatable = await expectExpression(
        'esaggs_shift_date_histogram',
        expression
      ).getResponse();
      expect(result.rows.length).to.be(25);
      checkShift(result.rows, result.columns);
    });

    it('shifts filtered metrics', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggDateHistogram id="1" enabled=true schema="bucket" field="@timestamp" interval="1h"}
          aggs={aggFilteredMetric
            id="2"
            customBucket={aggFilter
              id="2-filter"
              enabled=true
              schema="bucket"
              filter={kql "geo.src:US"}
            }
            customMetric={aggAvg id="3"
              field="bytes"
              enabled=true
              schema="metric"
            }
            enabled=true
            schema="metric"
            timeShift="1h"
          }
          aggs={aggFilteredMetric
            id="4"
            customBucket={aggFilter
              id="4-filter"
              enabled=true
              schema="bucket"
              filter={kql "geo.src:US"}
            }
            customMetric={aggAvg id="5"
              field="bytes"
              enabled=true
              schema="metric"
            }
            enabled=true
            schema="metric"
          }
        `;
      const result: Datatable = await expectExpression(
        'esaggs_shift_filtered_metrics',
        expression
      ).getResponse();
      expect(result.rows.length).to.be(25);
      checkShift(result.rows, result.columns);
    });

    it('shifts terms', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggTerms id="1" field="geo.src" size="3" enabled=true schema="bucket" orderAgg={aggCount id="order" enabled=true schema="metric"} otherBucket=true}
          aggs={aggAvg id="2" field="bytes" enabled=true schema="metric" timeShift="1d"}
          aggs={aggAvg id="3" field="bytes" enabled=true schema="metric"}
        `;
      const result: Datatable = await expectExpression(
        'esaggs_shift_terms',
        expression
      ).getResponse();
      expect(result.rows).to.eql([
        {
          'col-0-1': 'CN',
          'col-1-2': 40,
          'col-2-3': 5806.404352806415,
        },
        {
          'col-0-1': 'IN',
          'col-1-2': 7901,
          'col-2-3': 5838.315923566879,
        },
        {
          'col-0-1': 'US',
          'col-1-2': 7440,
          'col-2-3': 5614.142857142857,
        },
        {
          'col-0-1': '__other__',
          'col-1-2': 5766.575645756458,
          'col-2-3': 5742.1265576323985,
        },
      ]);
    });

    it('shifts filters', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggFilters id="1" filters={queryFilter {kql "geo.src:\\"US\\" "}} filters={queryFilter {kql "geo.src: \\"CN\\""}}}
          aggs={aggFilters id="2" filters={queryFilter {kql "geo.dest:\\"US\\" "}} filters={queryFilter {kql "geo.dest: \\"CN\\""}}}
          aggs={aggAvg id="3" field="bytes" enabled=true schema="metric" timeShift="2h"}
          aggs={aggAvg id="4" field="bytes" enabled=true schema="metric"}
        `;
      const result: Datatable = await expectExpression(
        'esaggs_shift_filters',
        expression
      ).getResponse();
      expect(result.rows).to.eql([
        {
          'col-0-1': 'geo.src:"US" ',
          'col-1-2': 'geo.dest:"US" ',
          'col-2-3': 5956.9,
          'col-3-4': 5956.9,
        },
        {
          'col-0-1': 'geo.src:"US" ',
          'col-1-2': 'geo.dest: "CN"',
          'col-2-3': 5127.854838709677,
          'col-3-4': 5085.746031746032,
        },
        {
          'col-0-1': 'geo.src: "CN"',
          'col-1-2': 'geo.dest:"US" ',
          'col-2-3': 5648.25,
          'col-3-4': 5643.793650793651,
        },
        {
          'col-0-1': 'geo.src: "CN"',
          'col-1-2': 'geo.dest: "CN"',
          'col-2-3': 5842.858823529412,
          'col-3-4': 5842.858823529412,
        },
      ]);
    });

    it('shifts histogram', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggHistogram id="1" field="bytes" interval=5000 enabled=true schema="bucket"}
          aggs={aggCount id="2" enabled=true schema="metric"}
          aggs={aggCount id="3" enabled=true schema="metric" timeShift="6h"}
        `;
      const result: Datatable = await expectExpression(
        'esaggs_shift_histogram',
        expression
      ).getResponse();
      expect(result.rows).to.eql([
        {
          'col-0-1': 0,
          'col-1-2': 2020,
          'col-2-3': 2036,
        },
        {
          'col-0-1': 5000,
          'col-1-2': 2360,
          'col-2-3': 2358,
        },
        {
          'col-0-1': 10000,
          'col-1-2': 126,
          'col-2-3': 127,
        },
        {
          'col-0-1': 15000,
          'col-1-2': 112,
          'col-2-3': 108,
        },
      ]);
    });

    it('shifts sibling pipeline aggs', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggBucketSum id="1" enabled=true schema="metric" customBucket={aggTerms id="2" enabled="true" schema="bucket" field="geo.src" size="3"} customMetric={aggCount id="4" enabled="true" schema="metric"}}
          aggs={aggBucketSum id="5" enabled=true schema="metric" timeShift="1d" customBucket={aggTerms id="6" enabled="true" schema="bucket" field="geo.src" size="3"} customMetric={aggCount id="7" enabled="true" schema="metric"}}
        `;
      const result: Datatable = await expectExpression(
        'esaggs_shift_sibling_pipeline_aggs',
        expression
      ).getResponse();
      expect(getCell(result, 0, 0)).to.be(2050);
      expect(getCell(result, 0, 1)).to.be(2053);
    });

    it('shifts parent pipeline aggs', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggDateHistogram id="1" enabled=true schema="bucket" field="@timestamp" interval="3h" min_doc_count=0}
          aggs={aggMovingAvg id="2" enabled=true schema="metric" metricAgg="custom" window=5 script="MovingFunctions.unweightedAvg(values)" timeShift="3h" customMetric={aggCount id="2-metric" enabled="true" schema="metric"}}
        `;
      const result: Datatable = await expectExpression(
        'esaggs_shift_parent_pipeline_aggs',
        expression
      ).getResponse();
      expect(result.rows).to.eql([
        {
          'col-0-1': 1442791800000,
          'col-1-2': null,
        },
        {
          'col-0-1': 1442802600000,
          'col-1-2': 30,
        },
        {
          'col-0-1': 1442813400000,
          'col-1-2': 30.5,
        },
        {
          'col-0-1': 1442824200000,
          'col-1-2': 69.66666666666667,
        },
        {
          'col-0-1': 1442835000000,
          'col-1-2': 198.5,
        },
        {
          'col-0-1': 1442845800000,
          'col-1-2': 415.6,
        },
        {
          'col-0-1': 1442856600000,
          'col-1-2': 702.2,
        },
        {
          'col-0-1': 1442867400000,
          'col-1-2': 859.8,
        },
        {
          'col-0-1': 1442878200000,
          'col-1-2': 878.4,
        },
      ]);
    });

    it('metrics at all levels should work for single shift', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'} metricsAtAllLevels=true
          aggs={aggCount id="1" enabled=true schema="metric" timeShift="1d"}
        `;
      const result = await expectExpression('esaggs_shift_single_metric', expression).getResponse();
      expect(getCell(result, 0, 0)).to.be(4763);
    });

    it('metrics at all levels should fail for multiple shifts', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'} metricsAtAllLevels=true
          aggs={aggCount id="1" enabled=true schema="metric" timeShift="1d"}
          aggs={aggCount id="2" enabled=true schema="metric"}
        `;
      const result = await expectExpression('esaggs_shift_single_metric', expression).getResponse();
      expect(result.type).to.be('error');
    });
  });
}
