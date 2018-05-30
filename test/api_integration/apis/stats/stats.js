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
  expect(body.status.overall.state).to.be('green');
  expect(body.status.statuses).to.be.an('array');
  const kibanaPlugin = body.status.statuses.find(s => {
    return s.id.indexOf('plugin:kibana') === 0;
  });
  expect(kibanaPlugin.state).to.be('green');

  expect(body.name).to.be.a('string');
  expect(body.uuid).to.be.a('string');

  expect(body.version.number).to.be.a('string');

  expect(body.process.mem.external_in_bytes).to.be.an('number');
  expect(body.process.mem.heap_max_in_bytes).to.be.an('number');
  expect(body.process.mem.heap_used_in_bytes).to.be.an('number');
  expect(body.process.mem.resident_set_size_in_bytes).to.be.an('number');
  expect(body.process.pid).to.be.an('number');
  expect(body.process.uptime_ms).to.be.an('number');

  expect(body.os.cpu.load_average['1m']).to.be.a('number');

  expect(body.response_times.avg_in_millis).not.to.be(null); // ok if is undefined
  expect(body.response_times.max_in_millis).not.to.be(null); // ok if is undefined

  expect(body.requests.status_codes).to.be.an('object');

  expect(body.sockets.http).to.be.an('object');
  expect(body.sockets.https).to.be.an('object');

  expect(body.concurrent_connections).to.be.a('number');

  expect(body.event_loop_delay).to.be.an('number');
};

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('kibana stats api', () => {
    it('should return the stats and metric fields without cluster_uuid when extended param is not present', () => {
      return supertest
        .get('/api/stats')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          expect(body.cluster_uuid).to.be(undefined);
          assertStatsAndMetrics(body);
        });
    });
    it('should return the stats and metric fields without cluster_uuid when extended param is given as false', () => {
      return supertest
        .get('/api/stats?extended=false')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          expect(body.cluster_uuid).to.be(undefined);
          assertStatsAndMetrics(body);
        });
    });

    it('should return the stats and metric fields with cluster_uuid when extended param is present', () => {
      return supertest
        .get('/api/stats?extended')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          expect(body.cluster_uuid).to.be.a('string');
          assertStatsAndMetrics(body);
        });
    });

    it('should return the stats and metric fields with cluster_uuid when extended param is given as true', () => {
      return supertest
        .get('/api/stats?extended=true')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          expect(body.cluster_uuid).to.be.a('string');
          assertStatsAndMetrics(body);
        });
    });
  });
}

