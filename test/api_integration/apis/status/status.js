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

export default function({ getService }) {
  const supertest = getService('supertest');

  describe('kibana status api', () => {
    it('returns version, status and metrics fields', () => {
      return supertest
        .get('/api/status')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          expect(body.name).to.be.a('string');
          expect(body.uuid).to.be.a('string');
          expect(body.version.number).to.be.a('string');
          expect(body.version.build_hash).to.be.a('string');
          expect(body.version.build_number).to.be.a('number');

          expect(body.status.overall).to.be.an('object');
          expect(body.status.overall.state).to.be('green');

          expect(body.status.statuses).to.be.an('array');
          const kibanaPlugin = body.status.statuses.find(s => {
            return s.id.indexOf('plugin:kibana') === 0;
          });
          expect(kibanaPlugin.state).to.be('green');

          expect(body.metrics.collection_interval_in_millis).to.be.a('number');

          expect(body.metrics.process.memory.heap.total_in_bytes).to.be.a('number');
          expect(body.metrics.process.memory.heap.used_in_bytes).to.be.a('number');
          expect(body.metrics.process.memory.heap.size_limit).to.be.a('number');

          expect(body.metrics.os.load['1m']).to.be.a('number');
          expect(body.metrics.os.load['5m']).to.be.a('number');
          expect(body.metrics.os.load['15m']).to.be.a('number');

          expect(body.metrics.response_times.avg_in_millis).not.to.be(null); // ok if undefined
          expect(body.metrics.response_times.max_in_millis).not.to.be(null); // ok if undefined

          expect(body.metrics.requests.total).to.be.a('number');
          expect(body.metrics.requests.disconnects).to.be.a('number');
          expect(body.metrics.concurrent_connections).to.be.a('number');
        });
    });
  });
}
