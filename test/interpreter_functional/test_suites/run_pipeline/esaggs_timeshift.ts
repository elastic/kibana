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
  const columnId = esaggsResult?.columns[column]?.id;
  if (!columnId) {
    return;
  }
  return esaggsResult?.rows[row]?.[columnId];
}

function checkShift(rows: Datatable['rows'], columns: Datatable['columns'], metricIndex = 1) {
  rows.shift();
  rows.pop();
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

    it('shifts pipeline aggs', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggBucketSum id="1" enabled=true schema="metric" customBucket={aggTerms id="2" enabled="true" schema="bucket" field="geo.src" size="3"} customMetric={aggCount id="4" enabled="true" schema="metric"}}
          aggs={aggBucketSum id="5" enabled=true schema="metric" timeShift="1d" customBucket={aggTerms id="6" enabled="true" schema="bucket" field="geo.src" size="3"} customMetric={aggCount id="7" enabled="true" schema="metric"}}
        `;
      const result: Datatable = await expectExpression(
        'esaggs_shift_pipeline_aggs',
        expression
      ).getResponse();
      expect(getCell(result, 0, 0)).to.be(2050);
      expect(getCell(result, 0, 1)).to.be(2053);
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
