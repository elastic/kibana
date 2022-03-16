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

  describe('esaggs_significanttext', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    const timeRange = {
      from: '2015-09-21T00:00:00Z',
      to: '2015-09-22T00:00:00Z',
    };

    describe('aggSignificantText', () => {
      it('can execute aggSignificantText', async () => {
        const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggSignificantText id="1" enabled=true schema="bucket" field="headings" size=10}
          aggs={aggCount id="2" enabled=true schema="metric"}
        `;
        const result = await expectExpression('sampler', expression).getResponse();

        expect(result.columns.length).to.be(2);
        const significantTermColumn = result.columns[0];
        expect(significantTermColumn.name).to.be('Top 10 unusual terms from "headings" text');

        const countColumn = result.columns[1];
        expect(countColumn.name).to.be('Count');

        expect(result.rows.length).to.be(10);

        expect(result.rows[0]['col-0-1']).to.be('facebook.com');
        expect(result.rows[0]['col-1-2']).to.be(815);
      });
    });
  });
}
