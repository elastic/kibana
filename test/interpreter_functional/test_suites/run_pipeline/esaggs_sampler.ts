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

  describe('esaggs_sampler', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    const timeRange = {
      from: '2015-09-21T00:00:00Z',
      to: '2015-09-22T00:00:00Z',
    };

    describe('aggSampler', () => {
      it('can execute aggSampler', async () => {
        const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggSampler id="0" enabled=true schema="bucket"}
          aggs={aggAvg id="1" enabled=true schema="metric" field="bytes"}
        `;
        const result = await expectExpression('sampler', expression).getResponse();

        expect(result.columns.length).to.be(2);
        const samplerColumn = result.columns[0];
        expect(samplerColumn.name).to.be('sampler');
        expect(samplerColumn.meta.sourceParams.params).to.eql({});

        expect(result.rows.length).to.be(1);
        expect(Object.keys(result.rows[0]).length).to.be(1);
        const resultFromSample = result.rows[0]['col-1-1']; // check that sampler bucket doesn't produce columns
        expect(typeof resultFromSample).to.be('number');
        expect(resultFromSample).to.greaterThan(0); //  can't check exact metric using sample
      });

      it('can execute aggSampler with custom shard_size', async () => {
        const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggSampler id="0" enabled=true schema="bucket" shard_size=20}
          aggs={aggAvg id="1" enabled=true schema="metric" field="bytes"}
        `;
        const result = await expectExpression('sampler', expression).getResponse();

        expect(result.columns.length).to.be(2);
        const samplerColumn = result.columns[0];
        expect(samplerColumn.name).to.be('sampler');
        expect(samplerColumn.meta.sourceParams.params).to.eql({ shard_size: 20 });

        expect(result.rows.length).to.be(1);
        expect(Object.keys(result.rows[0]).length).to.be(1); // check that sampler bucket doesn't produce columns
        const resultFromSample = result.rows[0]['col-1-1'];
        expect(typeof resultFromSample).to.be('number');
        expect(resultFromSample).to.greaterThan(0); // can't check exact metric using sample
      });
    });

    describe('aggDiversifiedSampler', () => {
      it('can execute aggDiversifiedSampler', async () => {
        const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggDiversifiedSampler id="0" enabled=true schema="bucket" field="extension.raw"}
          aggs={aggAvg id="1" enabled=true schema="metric" field="bytes"}
        `;
        const result = await expectExpression('sampler', expression).getResponse();

        expect(result.columns.length).to.be(2);
        const samplerColumn = result.columns[0];
        expect(samplerColumn.name).to.be('diversified_sampler');
        expect(samplerColumn.meta.sourceParams.params).to.eql({ field: 'extension.raw' });

        expect(result.rows.length).to.be(1);
        expect(Object.keys(result.rows[0]).length).to.be(1);
        const resultFromSample = result.rows[0]['col-1-1']; // check that sampler bucket doesn't produce columns
        expect(typeof resultFromSample).to.be('number');
        expect(resultFromSample).to.greaterThan(0); //  can't check exact metric using sample
      });

      it('can execute aggSampler with custom shard_size and max_docs_per_value', async () => {
        const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggDiversifiedSampler id="0" enabled=true schema="bucket" field="extension.raw" shard_size=20 max_docs_per_value=3}
          aggs={aggAvg id="1" enabled=true schema="metric" field="bytes"}
        `;
        const result = await expectExpression('sampler', expression).getResponse();

        expect(result.columns.length).to.be(2);
        const samplerColumn = result.columns[0];
        expect(samplerColumn.name).to.be('diversified_sampler');
        expect(samplerColumn.meta.sourceParams.params).to.eql({
          field: 'extension.raw',
          max_docs_per_value: 3,
          shard_size: 20,
        });

        expect(result.rows.length).to.be(1);
        expect(Object.keys(result.rows[0]).length).to.be(1); // check that sampler bucket doesn't produce columns
        const resultFromSample = result.rows[0]['col-1-1'];
        expect(typeof resultFromSample).to.be('number');
        expect(resultFromSample).to.greaterThan(0); // can't check exact metric using sample
      });
    });
  });
}
