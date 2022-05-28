/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
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
          expect(body.status.overall.level).to.be.a('string');

          expect(body.status.core).to.be.an('object');
          expect(body.status.plugins).to.be.an('object');

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
