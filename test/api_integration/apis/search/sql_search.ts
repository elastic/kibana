/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const sqlQuery = `SELECT index, bytes FROM "logstash-*" ORDER BY "@timestamp" DESC`;

  describe('SQL search', () => {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });
    describe('post', () => {
      it('should return 200 when correctly formatted searches are provided', async () => {
        const resp = await supertest
          .post(`/internal/search/sql`)
          .send({
            params: {
              query: sqlQuery,
            },
          })
          .expect(200);

        expect(resp.body).to.have.property('id');
        expect(resp.body).to.have.property('isPartial');
        expect(resp.body).to.have.property('isRunning');
        expect(resp.body).to.have.property('rawResponse');
      });

      it('should fetch search results by id', async () => {
        const resp1 = await supertest
          .post(`/internal/search/sql`)
          .send({
            params: {
              query: sqlQuery,
              keep_on_completion: true, // force keeping the results even if completes early
            },
          })
          .expect(200);
        const id = resp1.body.id;

        const resp2 = await supertest.post(`/internal/search/sql/${id}`).send({});

        expect(resp2.status).to.be(200);
        expect(resp2.body.id).to.be(id);
        expect(resp2.body).to.have.property('isPartial');
        expect(resp2.body).to.have.property('isRunning');
        expect(resp2.body).to.have.property('rawResponse');
      });
    });

    describe('delete', () => {
      it('should delete search', async () => {
        const resp1 = await supertest
          .post(`/internal/search/sql`)
          .send({
            params: {
              query: sqlQuery,
              keep_on_completion: true, // force keeping the results even if completes early
            },
          })
          .expect(200);
        const id = resp1.body.id;

        // confirm it was saved
        await supertest.post(`/internal/search/sql/${id}`).send({}).expect(200);

        // delete it
        await supertest.delete(`/internal/search/sql/${id}`).send().expect(200);

        // check it was deleted
        await supertest.post(`/internal/search/sql/${id}`).send({}).expect(404);
      });
    });
  });
}
