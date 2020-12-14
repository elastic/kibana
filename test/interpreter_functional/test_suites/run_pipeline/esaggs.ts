/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { ExpectExpression, expectExpressionProvider } from './helpers';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

function getCell(esaggsResult: any, column: number, row: number): unknown | undefined {
  const columnId = esaggsResult?.columns[column]?.id;
  if (!columnId) {
    return;
  }
  return esaggsResult?.rows[row]?.[columnId];
}

export default function ({
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const supertest = getService('supertest');
  let expectExpression: ExpectExpression;

  const expectClientToMatchServer = async (title: string, expression: string) => {
    const clientResult = await expectExpression(title, expression).getResponse();
    await supertest
      .post('/api/interpreter_functional/run_expression')
      .set('kbn-xsrf', 'anything')
      .send({ expression, input: undefined })
      .expect(200)
      .expect(({ body }) => {
        expect(body.rows).to.eql(clientResult.rows);
      });
  };

  describe('esaggs pipeline expression tests', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    describe('correctly filters based on context', () => {
      it('filters on index pattern primary date field by default', async () => {
        const timeRange = {
          from: '2006-09-21T00:00:00Z',
          to: '2015-09-22T00:00:00Z',
        };
        const expression = `
          kibana_context timeRange='${JSON.stringify(timeRange)}'
          | esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggCount id="1" enabled=true schema="metric"}
        `;
        const result = await expectExpression('esaggs_primary_timefield', expression).getResponse();
        expect(getCell(result, 0, 0)).to.be(9375);
      });

      it('filters on the specified date field', async () => {
        const timeRange = {
          from: '2006-09-21T00:00:00Z',
          to: '2015-09-22T00:00:00Z',
        };
        const expression = `
          kibana_context timeRange='${JSON.stringify(timeRange)}'
          | esaggs index={indexPatternLoad id='logstash-*'}
          timeFields='relatedContent.article:published_time'
          aggs={aggCount id="1" enabled=true schema="metric"}
        `;
        const result = await expectExpression('esaggs_other_timefield', expression).getResponse();
        expect(getCell(result, 0, 0)).to.be(11134);
      });

      it('filters on multiple specified date field', async () => {
        const timeRange = {
          from: '2006-09-21T00:00:00Z',
          to: '2015-09-22T00:00:00Z',
        };
        const expression = `
          kibana_context timeRange='${JSON.stringify(timeRange)}'
          | esaggs index={indexPatternLoad id='logstash-*'}
          timeFields='relatedContent.article:published_time'
          timeFields='@timestamp'
          aggs={aggCount id="1" enabled=true schema="metric"}
        `;
        const result = await expectExpression(
          'esaggs_multiple_timefields',
          expression
        ).getResponse();
        expect(getCell(result, 0, 0)).to.be(7452);
      });
    });

    describe('correctly runs on the server', () => {
      it('runs the provided agg on the server', async () => {
        const expression = `
          esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggAvg id="1" enabled=true schema="metric" field="bytes"}
        `;
        await supertest
          .post('/api/interpreter_functional/run_expression')
          .set('kbn-xsrf', 'anything')
          .send({ expression, input: undefined })
          .expect(200)
          .expect(({ body }) => {
            expect(body.columns[0].meta.index).to.be('logstash-*');
            expect(body.columns[0].meta.source).to.be('esaggs');
            expect(body.columns[0].meta.sourceParams.type).to.be('avg');
            expect(getCell(body, 0, 0)).to.be(5727.3136246786635);
          });
      });

      it('works with timeRange filters', async () => {
        const timeRange = {
          from: '2006-09-21T00:00:00Z',
          to: '2015-09-22T00:00:00Z',
        };
        // we need to manually pass timeRange in the input until
        // kibana_context is supported on the server
        const kibanaContext = {
          type: 'kibana_context',
          timeRange,
        };
        const expression = `
          esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggCount id="1" enabled=true schema="metric"}
        `;
        await supertest
          .post('/api/interpreter_functional/run_expression')
          .set('kbn-xsrf', 'anything')
          .send({ expression, input: kibanaContext })
          .expect(200)
          .expect(({ body }) => {
            expect(getCell(body, 0, 0)).to.be(9375);
          });
      });

      it('returns same results on client & server', async () => {
        const a = `
          esaggs index={indexPatternLoad id='logstash-*'}
          aggs={aggCount id="1" enabled=true schema="metric"}
          aggs={aggTerms id="2" enabled=true schema="segment" field="response.raw"}
        `;
        await expectClientToMatchServer('multiple_aggs', a);

        // const b = `
        //   esaggs index={indexPatternLoad id='logstash-*'}
        //   aggs={aggCount id="1" enabled=true schema="metric"}
        // `;

        // const c = `
        //   esaggs index={indexPatternLoad id='logstash-*'}
        //   aggs={aggCount id="1" enabled=true schema="metric"}
        // `;
      });
    });
  });
}
