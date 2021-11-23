/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

const assertStatsAndMetrics = (body) => {
  expect(body.kibana.name).to.be.a('string');
  expect(body.kibana.uuid).to.be.a('string');
  expect(body.kibana.host).to.be.a('string');
  expect(body.kibana.transport_address).to.be.a('string');
  expect(body.kibana.version).to.be.a('string');
  expect(body.kibana.snapshot).to.be.a('boolean');
  expect(body.kibana.status).to.be.a('string');

  expect(body.process.memory.heap.total_bytes).to.be.a('number');
  expect(body.process.memory.heap.used_bytes).to.be.a('number');
  expect(body.process.memory.heap.size_limit).to.be.a('number');
  expect(body.process.memory.resident_set_size_bytes).to.be.a('number');
  expect(body.process.pid).to.be.a('number');
  expect(body.process.uptime_ms).to.be.a('number');
  expect(body.process.event_loop_delay).to.be.a('number');

  expect(body.os.memory.free_bytes).to.be.a('number');
  expect(body.os.memory.total_bytes).to.be.a('number');
  expect(body.os.uptime_ms).to.be.a('number');

  expect(body.os.load['1m']).to.be.a('number');
  expect(body.os.load['5m']).to.be.a('number');
  expect(body.os.load['15m']).to.be.a('number');

  expect(body.response_times.avg_ms).not.to.be(null); // ok if is undefined
  expect(body.response_times.max_ms).not.to.be(null); // ok if is undefined

  expect(body.requests.total).to.be.a('number');
  expect(body.requests.disconnects).to.be.a('number');

  expect(body.concurrent_connections).to.be.a('number');
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
