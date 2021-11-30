/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { get } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  describe('telemetry API', () => {
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

    it('should increment the opt *in* counter in the .kibana/kql-telemetry document', async () => {
      await supertest
        .post('/api/kibana/kql_opt_in_stats')
        .set('content-type', 'application/json')
        .send({ opt_in: true })
        .expect(200);

      return es
        .search({
          index: '.kibana',
          q: 'type:kql-telemetry',
        })
        .then((response) => {
          const kqlTelemetryDoc = get(response, 'hits.hits[0]._source.kql-telemetry');
          expect(kqlTelemetryDoc.optInCount).to.be(1);
        });
    });

    it('should increment the opt *out* counter in the .kibana/kql-telemetry document', async () => {
      await supertest
        .post('/api/kibana/kql_opt_in_stats')
        .set('content-type', 'application/json')
        .send({ opt_in: false })
        .expect(200);

      return es
        .search({
          index: '.kibana',
          q: 'type:kql-telemetry',
        })
        .then((response) => {
          const kqlTelemetryDoc = get(response, 'hits.hits[0]._source.kql-telemetry');
          expect(kqlTelemetryDoc.optOutCount).to.be(1);
        });
    });

    it('should report success when opt *in* is incremented successfully', () => {
      return supertest
        .post('/api/kibana/kql_opt_in_stats')
        .set('content-type', 'application/json')
        .send({ opt_in: true })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          expect(body.success).to.be(true);
        });
    });

    it('should report success when opt *out* is incremented successfully', () => {
      return supertest
        .post('/api/kibana/kql_opt_in_stats')
        .set('content-type', 'application/json')
        .send({ opt_in: false })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          expect(body.success).to.be(true);
        });
    });

    it('should only accept literal boolean values for the opt_in POST body param', function () {
      return Promise.all([
        supertest
          .post('/api/kibana/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .send({ opt_in: 'notabool' })
          .expect(400),
        supertest
          .post('/api/kibana/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .send({ opt_in: 0 })
          .expect(400),
        supertest
          .post('/api/kibana/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .send({ opt_in: null })
          .expect(400),
        supertest
          .post('/api/kibana/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .send({ opt_in: undefined })
          .expect(400),
        supertest
          .post('/api/kibana/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .send({})
          .expect(400),
      ]);
    });
  });
}
