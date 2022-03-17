/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { DatatableRow } from 'src/plugins/expressions';
import { ExpectExpression, expectExpressionProvider } from './helpers';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  let expectExpression: ExpectExpression;

  describe('esaggs_rareterms', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    const timeRange = {
      from: '2015-09-21T00:00:00Z',
      to: '2015-09-22T00:00:00Z',
    };

    describe('aggRareTerms', () => {
      it('can execute aggRareTerms', async () => {
        const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggRareTerms id="1" enabled=true schema="bucket" field="geo.srcdest" max_doc_count=1}
          aggs={aggCount id="2" enabled=true schema="metric"}
        `;
        const result = await expectExpression('rareterms', expression).getResponse();

        expect(result.rows.length).to.be(1149);
        result.rows.forEach((row: DatatableRow) => {
          expect(row['col-1-2']).to.be(1);
        });
      });
    });
  });
}
