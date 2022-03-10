/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { ExpectExpression, expectExpressionProvider } from './helpers';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  let expectExpression: ExpectExpression;

  describe('esaggs_topmetrics', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    const timeRange = {
      from: '2015-09-21T00:00:00Z',
      to: '2015-09-22T00:00:00Z',
    };

    describe('aggTopMetrics', () => {
      it('can execute aggTopMetrics', async () => {
        const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggTerms id="1" enabled=true schema="bucket" field="extension.raw"}
          aggs={aggTopMetrics id="2" enabled=true schema="metric" field="bytes" sortField="@timestamp" sortOrder="desc" size=3 }
        `;
        const result = await expectExpression('aggTopMetrics', expression).getResponse();

        expect(result.rows.map((r: { 'col-0-1': string }) => r['col-0-1'])).to.eql([
          'jpg',
          'css',
          'png',
          'gif',
          'php',
        ]);

        result.rows.forEach((r: { 'col-1-2': number[] }) => {
          expect(r['col-1-2'].length).to.be(3);
          expect(
            r['col-1-2'].forEach((metric) => {
              expect(typeof metric).to.be('number');
            })
          );
        });
      });

      it('can execute aggTopMetrics with different sortOrder and size', async () => {
        const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggTerms id="1" enabled=true schema="bucket" field="extension.raw"}
          aggs={aggTopMetrics id="2" enabled=true schema="metric" field="bytes" sortField="@timestamp" sortOrder="asc" size=1 }
        `;
        const result = await expectExpression('aggTopMetrics', expression).getResponse();

        expect(result.rows.map((r: { 'col-0-1': string }) => r['col-0-1'])).to.eql([
          'jpg',
          'css',
          'png',
          'gif',
          'php',
        ]);

        result.rows.forEach((r: { 'col-1-2': number[] }) => {
          expect(typeof r['col-1-2']).to.be('number');
        });
      });

      it('can use aggTopMetrics as an orderAgg of aggTerms', async () => {
        const expressionSortBytesAsc = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggTerms id="1" enabled=true schema="bucket" field="extension.raw" size=1 orderAgg={aggTopMetrics id="order" enabled=true schema="metric" field="bytes" sortField="@timestamp" sortOrder="asc" size=1}}
          aggs={aggCount id="2" enabled=true schema="metric"}
        `;

        const resultSortBytesAsc = await expectExpression(
          'sortBytesAsc',
          expressionSortBytesAsc
        ).getResponse();

        const expressionSortBytesDesc = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggTerms id="1" enabled=true schema="bucket" field="extension.raw" size=1 orderAgg={aggTopMetrics id="order" enabled=true schema="metric" field="bytes" sortField="@timestamp" sortOrder="desc" size=1}}
          aggs={aggCount id="2" enabled=true schema="metric"}
        `;

        const resultSortBytesDesc = await expectExpression(
          'sortBytesDesc',
          expressionSortBytesDesc
        ).getResponse();

        expect(resultSortBytesAsc.rows.length).to.be(1);
        expect(resultSortBytesAsc.rows[0]['col-0-1']).to.be('jpg');

        expect(resultSortBytesDesc.rows.length).to.be(1);
        expect(resultSortBytesDesc.rows[0]['col-0-1']).to.be('php');
      });
    });
  });
}
