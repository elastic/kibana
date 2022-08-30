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
  const supertest = getService('supertest');
  let expectExpression: ExpectExpression;

  describe('essql', () => {
    before(() => {
      expectExpression = expectExpressionProvider({ getService, updateBaselines });
    });

    it('should run a query', async () => {
      const expression = `
        essql query='select "@message" from "logstash-*"'
      `;
      const result = await expectExpression('essql', expression).getResponse();

      expect(result).to.have.property('type', 'datatable');
      expect(result).to.have.property('columns');
      expect(result).to.have.property('rows');
    });

    it('should return a datatable', async () => {
      const expression = `
        essql query='select "@timestamp", "@message", bytes from "logstash-*" order by "@timestamp"' count=5
      `;

      await expectExpression('essql', expression).toMatchSnapshot();
    });

    it('should run an aggregation query', async () => {
      const expression = `
        essql query='select count(*) as count from "logstash-*"'
      `;

      const result = await expectExpression('essql_count_aggregation', expression).getResponse();

      expect(result?.rows?.[0]?.count).to.be(14004);
    });

    it('should respect the count parameter', async () => {
      const expression = `
        essql query='select "@message" from "logstash-*"' count=100
      `;
      const result = await expectExpression('essql_count_parameter', expression).getResponse();

      expect(result).to.have.property('rows');
      expect(result.rows).to.have.length(100);
    });

    it('should interpolate query parameters', async () => {
      const expression = `
        essql
          query='select count(*) as count from "logstash-*" where "@timestamp" >= ? and "@timestamp" <= ?'
          parameter="2006-09-21T00:00:00Z"
          parameter="2015-09-22T00:00:00Z"
      `;
      const result = await expectExpression('essql', expression).getResponse();

      expect(result?.rows?.[0]?.count).to.be(9375);
    });

    it('should return the same result on client and server', async () => {
      const expression = `
        essql query='select "@message" from "logstash-*"' count=10
      `;

      const client = await expectExpression('essql', expression).getResponse();
      await supertest
        .post('/api/interpreter_functional/run_expression')
        .set('kbn-xsrf', 'anything')
        .send({ expression, input: undefined })
        .expect(200)
        .expect(({ body }) => {
          expect(body.rows).to.eql(client.rows);
        });
    });

    it('should support `kibana_context` query on input', async () => {
      const expression = `
        kibana_context {kql "geo.src: US"}
        | essql query='select count(*) as count from "logstash-*"'
      `;
      const result = await expectExpression('essql_kibana_context_query', expression).getResponse();

      expect(result?.rows?.[0]?.count).to.be(1194);
    });

    it('should support `kibana_context` filters on input', async () => {
      const expression = `
        kibana_context filters={phraseFilter field={field name="geo.src" type="string"} phrase="US"}
        | essql query='select count(*) as count from "logstash-*"'
      `;
      const result = await expectExpression(
        'essql_kibana_context_filters',
        expression
      ).getResponse();

      expect(result?.rows?.[0]?.count).to.be(1194);
    });

    it('should support `kibana_context` time range on input', async () => {
      const expression = `
        kibana_context timeRange={timerange from="2006-09-21T00:00:00Z" to="2015-09-22T00:00:00Z"}
        | essql query='select count(*) as count from "logstash-*"' timeField="@timestamp"
      `;
      const result = await expectExpression(
        'essql_kibana_context_timerange',
        expression
      ).getResponse();

      expect(result?.rows?.[0]?.count).to.be(9375);
    });
  });
}
