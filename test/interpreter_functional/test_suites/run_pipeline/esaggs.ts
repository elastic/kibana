/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  const kibanaServer = getService('kibanaServer');
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
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
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
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
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
          kibana_context timeRange={timerange from='${timeRange.from}' to='${timeRange.to}'}
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

    describe('loads a saved search', () => {
      before(async () => {
        await kibanaServer.importExport.load(
          'test/functional/fixtures/kbn_archiver/saved_search.json'
        );
      });
      after(async () => {
        await kibanaServer.importExport.unload(
          'test/functional/fixtures/kbn_archiver/saved_search.json'
        );
      });

      const expression = `
        kibana_context savedSearchId="ab12e3c0-f231-11e6-9486-733b1ac9221a"
        | esaggs index={indexPatternLoad id='logstash-*'}
        aggs={aggCount id="1" enabled=true schema="metric"}
      `;

      it('correctly applies filter from saved search', async () => {
        const result = await expectExpression('esaggs_saved_searches', expression).getResponse();
        expect(getCell(result, 0, 0)).to.be(119);
      });

      it('correctly applies filter - on the server', async () => {
        await supertest
          .post('/api/interpreter_functional/run_expression')
          .set('kbn-xsrf', 'anything')
          .send({ expression, input: undefined })
          .expect(200)
          .expect(({ body }) => {
            expect(body.columns[0].meta.index).to.be('logstash-*');
            expect(body.columns[0].meta.source).to.be('esaggs');
            expect(getCell(body, 0, 0)).to.be(119);
          });
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
