/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { schema } from '@kbn/config-schema';

const statsResponseSchema = schema.object({
  kibana: schema.object({
    name: schema.string(),
    uuid: schema.string(),
    host: schema.string(),
    transport_address: schema.string(),
    version: schema.string(),
    snapshot: schema.string(),
    status: schema.string(),
  }),
  process: schema.object({
    pid: schema.number(),
    uptime_ms: schema.number(),
    event_loop_delay: schema.number(),
    event_loop_utilization: schema.object({
      active: schema.number(),
      idle: schema.number(),
      utilization: schema.number(),
      load: schema.object({
        short: schema.number(),
        medium: schema.number(),
        long: schema.number(),
      }),
    }),
    memory: schema.object({
      heap: schema.object({
        total_bytes: schema.number(),
        used_bytes: schema.number(),
        size_limit: schema.number(),
      }),
      resident_set_size_bytes: schema.number(),
    }),
  }),
  os: schema.object({
    memory: schema.object({
      free_bytes: schema.number(),
      total_bytes: schema.number(),
    }),
    uptime_ms: schema.number(),
    load: schema.object({
      '1m': schema.number(),
      '5m': schema.number(),
      '15m': schema.number(),
    }),
  }),
  response_times: schema.object({
    avg_ms: schema.maybe(schema.number()),
    max_ms: schema.maybe(schema.number()),
  }),
  requests: schema.object({
    total: schema.number(),
    disconnects: schema.number(),
  }),
  concurrent_connections: schema.number(),
});

const assertStatsAndMetrics = (body) => {
  expect(() => statsResponseSchema.validate(body)).not.to.throwError();
};

export default function ({ getService }) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('kibana stats api', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
    });
    after(async () => {
      await kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
    });

    describe('basic', () => {
      it('should return the stats without cluster_uuid with no query string params', () => {
        return supertest
          .get('/api/stats')
          .expect('Content-Type', /json/)
          .expect(200)
          .then(({ body }) => {
            expect(body.cluster_uuid).to.be(undefined);
            assertStatsAndMetrics(body);
          });
      });
      it(`should return the stats without cluster_uuid with 'extended' query string param = false`, () => {
        return supertest
          .get('/api/stats?extended=false')
          .expect('Content-Type', /json/)
          .expect(200)
          .then(({ body }) => {
            expect(body.cluster_uuid).to.be(undefined);
            assertStatsAndMetrics(body);
          });
      });
    });

    // TODO load an es archive and verify the counts in saved object usage info
    describe('extended', () => {
      it(`should return the stats, cluster_uuid, and usage with 'extended' query string param present`, () => {
        return supertest
          .get('/api/stats?extended')
          .expect('Content-Type', /json/)
          .expect(200)
          .then(({ body }) => {
            expect(body.cluster_uuid).to.be.a('string');
            expect(body.usage).to.be.an('object'); // no usage collectors have been registered so usage is an empty object
            expect(body.usage).to.eql({});
            assertStatsAndMetrics(body);
          });
      });

      it(`should return the stats, cluster_uuid, and usage with 'extended' query string param = true`, () => {
        return supertest
          .get('/api/stats?extended=true')
          .expect('Content-Type', /json/)
          .expect(200)
          .then(({ body }) => {
            expect(body.cluster_uuid).to.be.a('string');
            expect(body.usage).to.be.an('object');
            expect(body.usage).to.eql({});
            assertStatsAndMetrics(body);
          });
      });

      describe('legacy', () => {
        it(`should return return the 'extended' data in the old format with 'legacy' query string param present`, () => {
          return supertest
            .get('/api/stats?extended&legacy')
            .expect('Content-Type', /json/)
            .expect(200)
            .then(({ body }) => {
              expect(body.clusterUuid).to.be.a('string');
              expect(body.usage).to.be.an('object'); // no usage collectors have been registered so usage is an empty object
              expect(body.usage).to.eql({});
              assertStatsAndMetrics(body, true);
            });
        });
      });

      describe('exclude usage', () => {
        it('should include an empty usage object from the API response', () => {
          return supertest
            .get('/api/stats?extended&exclude_usage')
            .expect('Content-Type', /json/)
            .expect(200)
            .then(({ body }) => {
              expect(body).to.have.property('usage');
              expect(body.usage).to.eql({});
            });
        });

        it('should include an empty usage object from the API response if `legacy` is provided', () => {
          return supertest
            .get('/api/stats?extended&exclude_usage&legacy')
            .expect('Content-Type', /json/)
            .expect(200)
            .then(({ body }) => {
              expect(body).to.have.property('usage');
              expect(body.usage).to.eql({});
            });
        });
      });
    });
  });
}
