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

import expect from 'expect.js';

const assertStatsAndMetrics = body => {
  expect(body.kibana.name).to.be.a('string');
  expect(body.kibana.uuid).to.be.a('string');
  expect(body.kibana.host).to.be.a('string');
  expect(body.kibana.transport_address).to.be.a('string');
  expect(body.kibana.version).to.be.a('string');
  expect(body.kibana.snapshot).to.be.a('boolean');
  expect(body.kibana.status).to.be('green');

  expect(body.process.mem.heap_max_bytes).to.be.a('number');
  expect(body.process.mem.heap_used_bytes).to.be.a('number');
  expect(body.process.mem.resident_set_size_bytes).to.be.a('number');
  expect(body.process.pid).to.be.a('number');
  expect(body.process.uptime_ms).to.be.a('number');

  expect(body.os.mem.free_bytes).to.be.a('number');
  expect(body.os.mem.total_bytes).to.be.a('number');
  expect(body.os.uptime_ms).to.be.a('number');

  expect(body.os.cpu.load_average['1m']).to.be.a('number');

  expect(body.response_times.avg_ms).not.to.be(null); // ok if is undefined
  expect(body.response_times.max_ms).not.to.be(null); // ok if is undefined

  expect(body.requests.status_codes).to.be.an('object');
  expect(body.requests.total).to.be.a('number');
  expect(body.requests.disconnects).to.be.a('number');

  expect(body.sockets.http.total).to.be.a('number');
  expect(body.sockets.https.total).to.be.a('number');

  expect(body.concurrent_connections).to.be.a('number');
  expect(body.event_loop_delay).to.be.a('number');
};

export default function ({ getService }) {
  const supertest = getService('supertest');
  // TODO possible to use supertestWithoutAuth service as well?

  describe('kibana stats api', () => {
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
            expect(body.usage.kibana).to.be.an('object');
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
            expect(body.usage.kibana).to.be.an('object');
            assertStatsAndMetrics(body);
          });
      });
    });
  });
}

