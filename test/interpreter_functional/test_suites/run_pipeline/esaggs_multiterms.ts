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

  describe('esaggs multiterms tests', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    const timeRange = {
      from: '2015-09-21T00:00:00Z',
      to: '2015-09-22T00:00:00Z',
    };

    it('can execute multi terms', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggMultiTerms id="0" enabled=true schema="bucket" fields="extension.raw" fields="geo.dest" size=5}
          aggs={aggCount id="1" enabled=true schema="metric"}
        `;
      const result = await expectExpression('esaggs_multi_terms', expression).getResponse();
      expect(result.rows).to.eql([
        { 'col-0-0': { keys: ['jpg', 'CN'] }, 'col-1-1': 587 },
        { 'col-0-0': { keys: ['jpg', 'IN'] }, 'col-1-1': 472 },
        { 'col-0-0': { keys: ['jpg', 'US'] }, 'col-1-1': 253 },
        { 'col-0-0': { keys: ['css', 'CN'] }, 'col-1-1': 146 },
        { 'col-0-0': { keys: ['jpg', 'ID'] }, 'col-1-1': 105 },
      ]);
    });

    it('can include other bucket and ordering', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggMultiTerms id="0" enabled=true schema="bucket" fields="extension.raw" fields="geo.dest" size=3 orderAgg={aggAvg id="order" field="bytes" enabled=true schema="metric"} otherBucket=true}
          aggs={aggCount id="1" enabled=true schema="metric"}
        `;
      const result = await expectExpression('esaggs_multi_terms_other', expression).getResponse();
      expect(result.rows).to.eql([
        { 'col-0-0': { keys: ['png', 'GH'] }, 'col-1-1': 1 },
        { 'col-0-0': { keys: ['png', 'PE'] }, 'col-1-1': 2 },
        { 'col-0-0': { keys: ['png', 'CL'] }, 'col-1-1': 2 },
        { 'col-0-0': { keys: ['__other__'] }, 'col-1-1': 4613 },
      ]);
    });

    it('can nest a regular terms', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggMultiTerms id="0" enabled=true schema="bucket" fields="extension.raw" fields="geo.dest" size=3 orderAgg={aggAvg id="order" field="bytes" enabled=true schema="metric"} otherBucket=true}
          aggs={aggTerms id="1" enabled=true schema="bucket" field="geo.src" size=3 orderAgg={aggAvg id="order" field="bytes" enabled=true schema="metric"} otherBucket=true}
          aggs={aggSum id="2" field="bytes" enabled=true schema="metric"}
        `;
      const result = await expectExpression('esaggs_multi_terms_nested', expression).getResponse();
      expect(result.rows).to.eql([
        { 'col-0-0': { keys: ['png', 'GH'] }, 'col-1-1': 'IN', 'col-2-2': 18787 },
        { 'col-0-0': { keys: ['png', 'PE'] }, 'col-1-1': 'GT', 'col-2-2': 19328 },
        { 'col-0-0': { keys: ['png', 'PE'] }, 'col-1-1': 'BD', 'col-2-2': 18042 },
        { 'col-0-0': { keys: ['png', 'CL'] }, 'col-1-1': 'US', 'col-2-2': 19579 },
        { 'col-0-0': { keys: ['png', 'CL'] }, 'col-1-1': 'CN', 'col-2-2': 17681 },
        { 'col-0-0': { keys: ['__other__'] }, 'col-1-1': 'DK', 'col-2-2': 20004 },
        { 'col-0-0': { keys: ['__other__'] }, 'col-1-1': 'FI', 'col-2-2': 58508 },
        { 'col-0-0': { keys: ['__other__'] }, 'col-1-1': 'QA', 'col-2-2': 9487 },
        { 'col-0-0': { keys: ['__other__'] }, 'col-1-1': '__other__', 'col-2-2': 26417178 },
      ]);
    });

    it('can be nested into a regular terms', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggTerms id="0" enabled=true schema="bucket" field="geo.src" size=3 orderAgg={aggAvg id="order" field="bytes" enabled=true schema="metric"} otherBucket=true}
          aggs={aggMultiTerms id="1" enabled=true schema="bucket" fields="extension.raw" fields="geo.dest" size=3 orderAgg={aggAvg id="order" field="bytes" enabled=true schema="metric"} otherBucket=true}
          aggs={aggSum id="2" field="bytes" enabled=true schema="metric"}
        `;
      const result = await expectExpression('esaggs_multi_terms_nested2', expression).getResponse();
      expect(result.rows).to.eql([
        { 'col-0-0': 'DK', 'col-1-1': { keys: ['png', 'IN'] }, 'col-2-2': 11004 },
        { 'col-0-0': 'DK', 'col-1-1': { keys: ['jpg', 'VN'] }, 'col-2-2': 9000 },
        { 'col-0-0': 'FI', 'col-1-1': { keys: ['png', 'CZ'] }, 'col-2-2': 16089 },
        { 'col-0-0': 'FI', 'col-1-1': { keys: ['png', 'MX'] }, 'col-2-2': 13360 },
        { 'col-0-0': 'FI', 'col-1-1': { keys: ['jpg', 'KH'] }, 'col-2-2': 8864 },
        { 'col-0-0': 'FI', 'col-1-1': { keys: ['__other__'] }, 'col-2-2': 20195 },
        { 'col-0-0': 'QA', 'col-1-1': { keys: ['css', 'CL'] }, 'col-2-2': 9487 },
        { 'col-0-0': '__other__', 'col-1-1': { keys: ['png', 'GH'] }, 'col-2-2': 18787 },
        { 'col-0-0': '__other__', 'col-1-1': { keys: ['png', 'PE'] }, 'col-2-2': 37370 },
        { 'col-0-0': '__other__', 'col-1-1': { keys: ['png', 'CL'] }, 'col-2-2': 37260 },
        { 'col-0-0': '__other__', 'col-1-1': { keys: ['__other__'] }, 'col-2-2': 26417178 },
      ]);
    });

    it('can be nested into itself', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggMultiTerms id="0" enabled=true schema="bucket" fields="geo.src" fields="host.raw" size=3 orderAgg={aggAvg id="order" field="bytes" enabled=true schema="metric"} otherBucket=true}
          aggs={aggMultiTerms id="1" enabled=true schema="bucket" fields="extension.raw" fields="geo.dest" size=3 orderAgg={aggAvg id="order" field="bytes" enabled=true schema="metric"} otherBucket=true}
          aggs={aggCount id="2" enabled=true schema="metric"}
        `;
      const result = await expectExpression('esaggs_multi_terms_nested3', expression).getResponse();
      expect(result.rows).to.eql([
        {
          'col-0-0': {
            keys: ['DK', 'media-for-the-masses.theacademyofperformingartsandscience.org'],
          },
          'col-1-1': { keys: ['png', 'IN'] },
          'col-2-2': 1,
        },
        {
          'col-0-0': {
            keys: ['DK', 'media-for-the-masses.theacademyofperformingartsandscience.org'],
          },
          'col-1-1': { keys: ['jpg', 'VN'] },
          'col-2-2': 1,
        },
        {
          'col-0-0': { keys: ['GB', 'theacademyofperformingartsandscience.org'] },
          'col-1-1': { keys: ['php', 'IN'] },
          'col-2-2': 1,
        },
        {
          'col-0-0': {
            keys: ['KH', 'media-for-the-masses.theacademyofperformingartsandscience.org'],
          },
          'col-1-1': { keys: ['png', 'CN'] },
          'col-2-2': 1,
        },
        {
          'col-0-0': {
            keys: ['KH', 'media-for-the-masses.theacademyofperformingartsandscience.org'],
          },
          'col-1-1': { keys: ['jpg', 'RO'] },
          'col-2-2': 1,
        },
        { 'col-0-0': { keys: ['__other__'] }, 'col-1-1': { keys: ['png', 'GH'] }, 'col-2-2': 1 },
        { 'col-0-0': { keys: ['__other__'] }, 'col-1-1': { keys: ['png', 'PE'] }, 'col-2-2': 2 },
        { 'col-0-0': { keys: ['__other__'] }, 'col-1-1': { keys: ['png', 'CL'] }, 'col-2-2': 2 },
        { 'col-0-0': { keys: ['__other__'] }, 'col-1-1': { keys: ['__other__'] }, 'col-2-2': 4608 },
      ]);
    });

    it('can be nested into date histogram', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggDateHistogram id="0" enabled=true schema="bucket" field="@timestamp" interval="6h"}
          aggs={aggMultiTerms id="1" enabled=true schema="bucket" fields="extension.raw" fields="geo.dest" size=3 orderAgg={aggAvg id="order" field="bytes" enabled=true schema="metric"} otherBucket=true}
          aggs={aggSum id="2" field="bytes" enabled=true schema="metric"}
        `;
      const result = await expectExpression('esaggs_multi_terms_nested4', expression).getResponse();
      expect(result.rows).to.eql([
        { 'col-0-0': 1442781000000, 'col-1-1': { keys: ['png', 'IN'] }, 'col-2-2': 12097 },
        { 'col-0-0': 1442781000000, 'col-1-1': { keys: ['css', 'US'] }, 'col-2-2': 8768 },
        { 'col-0-0': 1442781000000, 'col-1-1': { keys: ['jpg', 'NG'] }, 'col-2-2': 8443 },
        { 'col-0-0': 1442781000000, 'col-1-1': { keys: ['__other__'] }, 'col-2-2': 131961 },
        { 'col-0-0': 1442802600000, 'col-1-1': { keys: ['png', 'SN'] }, 'col-2-2': 17545 },
        { 'col-0-0': 1442802600000, 'col-1-1': { keys: ['png', 'PR'] }, 'col-2-2': 16719 },
        { 'col-0-0': 1442802600000, 'col-1-1': { keys: ['png', 'JP'] }, 'col-2-2': 32921 },
        { 'col-0-0': 1442802600000, 'col-1-1': { keys: ['__other__'] }, 'col-2-2': 4146549 },
        { 'col-0-0': 1442824200000, 'col-1-1': { keys: ['png', 'GT'] }, 'col-2-2': 37794 },
        { 'col-0-0': 1442824200000, 'col-1-1': { keys: ['png', 'GH'] }, 'col-2-2': 18787 },
        { 'col-0-0': 1442824200000, 'col-1-1': { keys: ['png', 'PE'] }, 'col-2-2': 37370 },
        { 'col-0-0': 1442824200000, 'col-1-1': { keys: ['__other__'] }, 'col-2-2': 15724462 },
        { 'col-0-0': 1442845800000, 'col-1-1': { keys: ['png', 'ZA'] }, 'col-2-2': 19659 },
        { 'col-0-0': 1442845800000, 'col-1-1': { keys: ['png', 'CL'] }, 'col-2-2': 19579 },
        { 'col-0-0': 1442845800000, 'col-1-1': { keys: ['png', 'BF'] }, 'col-2-2': 18448 },
        { 'col-0-0': 1442845800000, 'col-1-1': { keys: ['__other__'] }, 'col-2-2': 6088917 },
        { 'col-0-0': 1442867400000, 'col-1-1': { keys: ['png', 'PL'] }, 'col-2-2': 14956 },
        { 'col-0-0': 1442867400000, 'col-1-1': { keys: ['jpg', 'BR'] }, 'col-2-2': 9474 },
        { 'col-0-0': 1442867400000, 'col-1-1': { keys: ['php', 'NL'] }, 'col-2-2': 9320 },
        { 'col-0-0': 1442867400000, 'col-1-1': { keys: ['__other__'] }, 'col-2-2': 224825 },
      ]);
    });

    it('can be used with filtered metric', async () => {
      const expression = `
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggMultiTerms id="0" enabled=true schema="bucket" fields="extension.raw" fields="geo.dest" size=3 orderAgg={aggFilteredMetric
            id="order-1"
            customBucket={aggFilter
              id="order-1-filter"
              enabled=true
              schema="bucket"
              filter={kql "geo.src:US"}
            }
            customMetric={aggSum id="order-2"
              field="bytes"
              enabled=true
              schema="metric"
            }
            enabled=true
            schema="metric"
          } otherBucket=true}
          aggs={aggFilteredMetric
            id="1"
            customBucket={aggFilter
              id="1-filter"
              enabled=true
              schema="bucket"
              filter={kql "geo.src:US"}
            }
            customMetric={aggSum id="2"
              field="bytes"
              enabled=true
              schema="metric"
            }
            enabled=true
            schema="metric"
          }
        `;
      const result = await expectExpression(
        'esaggs_multi_terms_filtered_metric',
        expression
      ).getResponse();
      expect(result.rows).to.eql([
        { 'col-0-0': { keys: ['jpg', 'IN'] }, 'col-1-1': 225557 },
        { 'col-0-0': { keys: ['jpg', 'CN'] }, 'col-1-1': 219324 },
        { 'col-0-0': { keys: ['jpg', 'US'] }, 'col-1-1': 106761 },
        { 'col-0-0': { keys: ['__other__'] }, 'col-1-1': 1649102 },
      ]);
    });
  });
}
