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

        expect(result.rows).to.eql([{ 'col-1-1': 5853.3942307692305 }]);
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

        expect(result.rows).to.eql([{ 'col-1-1': 5922.666666666667 }]);
      });
    });
  });
}
