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

  describe('esaggs number histogram tests', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    const timeRange = {
      from: '2015-09-21T00:00:00Z',
      to: '2015-09-22T00:00:00Z',
    };

    it('auto-extends bounds to total range', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggTerms id="0" enabled=true schema="bucket" field="extension.raw" size=3}
          aggs={aggHistogram id="1" enabled=true schema="bucket" field="bytes" interval=5000 autoExtendBounds=true min_doc_count=true}
          aggs={aggCount id="2" enabled=true schema="metric"}
        `;
      const result = await expectExpression(
        'esaggs_histogram_auto_extend',
        expression
      ).getResponse();
      expect(result.rows).to.eql([
        { 'col-0-0': 'jpg', 'col-1-1': 0, 'col-2-2': 1251 },
        { 'col-0-0': 'jpg', 'col-1-1': 5000, 'col-2-2': 1759 },
        // filling in empty buckets even though the histogram wouldn't extend to those
        { 'col-0-0': 'jpg', 'col-1-1': 10000, 'col-2-2': 0 },
        { 'col-0-0': 'jpg', 'col-1-1': 15000, 'col-2-2': 0 },
        { 'col-0-0': 'css', 'col-1-1': 0, 'col-2-2': 294 },
        { 'col-0-0': 'css', 'col-1-1': 5000, 'col-2-2': 402 },
        // filling in empty buckets even though the histogram wouldn't extend to those
        { 'col-0-0': 'css', 'col-1-1': 10000, 'col-2-2': 0 },
        { 'col-0-0': 'css', 'col-1-1': 15000, 'col-2-2': 0 },
        { 'col-0-0': 'png', 'col-1-1': 0, 'col-2-2': 90 },
        { 'col-0-0': 'png', 'col-1-1': 5000, 'col-2-2': 128 },
        { 'col-0-0': 'png', 'col-1-1': 10000, 'col-2-2': 126 },
        { 'col-0-0': 'png', 'col-1-1': 15000, 'col-2-2': 112 },
      ]);
    });
  });
}
