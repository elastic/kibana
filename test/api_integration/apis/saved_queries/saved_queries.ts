/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { SAVED_QUERY_BASE_URL } from '@kbn/data-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

// node scripts/functional_tests --config test/api_integration/config.js --grep="search session"

const mockSavedQuery = {
  title: 'my title',
  description: 'my description',
  query: {
    query: 'foo: bar',
    language: 'kql',
  },
  filters: [],
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe.only('Saved queries API', function () {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.clean({ types: ['query'] });
    });

    it('should return 200 for create saved query', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200)
        .then(({ body }) => {
          expect(body.id).to.have.length(36);
          expect(body.attributes.title).to.be('my title');
          expect(body.attributes.description).to.be('my description');
        }));

    it('should return 400 for create invalid saved query', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ description: 'my description' })
        .expect(400));

    it('should return 400 for create saved query with duplicate title', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200)
        .then(() =>
          supertest
            .post(`${SAVED_QUERY_BASE_URL}/_create`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send(mockSavedQuery)
            .expect(400)
        ));

    it('should return 200 for update saved query', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200)
        .then(({ body }) =>
          supertest
            .put(`${SAVED_QUERY_BASE_URL}/${body.id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send({
              ...mockSavedQuery,
              title: 'my updated title',
            })
            .expect(200)
            .then((res) => {
              expect(res.body.id).to.be(body.id);
              expect(res.body.attributes.title).to.be('my updated title');
            })
        ));

    it('should return 404 for update non-existent saved query', () =>
      supertest
        .put(`${SAVED_QUERY_BASE_URL}/invalid_id`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(404));

    it('should return 400 for update saved query with duplicate title', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200)
        .then(({ body }) =>
          supertest
            .post(`${SAVED_QUERY_BASE_URL}/_create`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send({ ...mockSavedQuery, title: 'my duplicate title' })
            .expect(200)
            .then(() =>
              supertest
                .put(`${SAVED_QUERY_BASE_URL}/${body.id}`)
                .set(ELASTIC_HTTP_VERSION_HEADER, '1')
                .send({ ...mockSavedQuery, title: 'my duplicate title' })
                .expect(400)
            )
        ));

    it('should return 200 for get saved query', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200)
        .then(({ body }) =>
          supertest
            .get(`${SAVED_QUERY_BASE_URL}/${body.id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .expect(200)
            .then((res) => {
              expect(res.body.id).to.be(body.id);
              expect(res.body.attributes.title).to.be(body.attributes.title);
            })
        ));

    it('should return 404 for get non-existent saved query', () =>
      supertest
        .get(`${SAVED_QUERY_BASE_URL}/invalid_id`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(404));

    it('should return 200 for saved query count', () =>
      supertest
        .get(`${SAVED_QUERY_BASE_URL}/_count`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200));

    it('should return expected counts for saved query count', async () => {
      await supertest
        .get(`${SAVED_QUERY_BASE_URL}/_count`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200)
        .then((res) => {
          expect(res.text).to.be('0');
        });

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200);

      const result = await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ ...mockSavedQuery, title: 'my title 2' })
        .expect(200);

      await supertest
        .get(`${SAVED_QUERY_BASE_URL}/_count`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200)
        .then((res) => {
          expect(res.text).to.be('2');
        });

      await supertest
        .delete(`${SAVED_QUERY_BASE_URL}/${result.body.id}`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);

      await supertest
        .get(`${SAVED_QUERY_BASE_URL}/_count`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200)
        .then((res) => {
          expect(res.text).to.be('1');
        });
    });

    it('should return 200 for find saved queries', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({})
        .expect(200));

    it('should return expected queries for find saved queries', async () => {
      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200);

      const result = await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ ...mockSavedQuery, title: 'my title 2' })
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({})
        .expect(200)
        .then((res) => {
          expect(res.body.total).to.be(2);
          expect(res.body.savedQueries.length).to.be(2);
        });

      await supertest
        .delete(`${SAVED_QUERY_BASE_URL}/${result.body.id}`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({})
        .expect(200)
        .then((res) => {
          expect(res.body.total).to.be(1);
          expect(res.body.savedQueries.length).to.be(1);
        });
    });

    it('should return expected queries for find saved queries with a search', async () => {
      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ ...mockSavedQuery, title: 'my title 2' })
        .expect(200);

      const result = await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ ...mockSavedQuery, title: 'my title 2 again' })
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ search: 'itle 2' })
        .expect(200)
        .then((res) => {
          expect(res.body.total).to.be(2);
          expect(res.body.savedQueries.length).to.be(2);
        });

      await supertest
        .delete(`${SAVED_QUERY_BASE_URL}/${result.body.id}`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ search: 'itle 2' })
        .expect(200)
        .then((res) => {
          expect(res.body.total).to.be(1);
          expect(res.body.savedQueries.length).to.be(1);
        });
    });

    it('should support pagination for find saved queries', async () => {
      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ ...mockSavedQuery, title: 'my title 2' })
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ ...mockSavedQuery, title: 'my title 3' })
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ perPage: 2 })
        .expect(200)
        .then((res) => {
          expect(res.body.total).to.be(3);
          expect(res.body.savedQueries.length).to.be(2);
        });

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ perPage: 2, page: 2 })
        .expect(200)
        .then((res) => {
          expect(res.body.total).to.be(3);
          expect(res.body.savedQueries.length).to.be(1);
        });
    });

    it('should support pagination for find saved queries with a search', async () => {
      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ ...mockSavedQuery, title: 'my title 2' })
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ ...mockSavedQuery, title: 'my title 3' })
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ ...mockSavedQuery, title: 'not a match' })
        .expect(200);

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ perPage: 2, search: 'itle' })
        .expect(200)
        .then((res) => {
          expect(res.body.total).to.be(3);
          expect(res.body.savedQueries.length).to.be(2);
        });

      await supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ perPage: 2, page: 2, search: 'itle' })
        .expect(200)
        .then((res) => {
          expect(res.body.total).to.be(3);
          expect(res.body.savedQueries.length).to.be(1);
        });
    });

    it('should return 400 for bad find saved queries request', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ foo: 'bar' })
        .expect(400));

    it('should return 200 for delete saved query', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200)
        .then(({ body }) =>
          supertest
            .delete(`${SAVED_QUERY_BASE_URL}/${body.id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .expect(200)
        ));

    it('should return 404 for get non-existent saved query', () =>
      supertest
        .delete(`${SAVED_QUERY_BASE_URL}/invalid_id`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(404));

    it('should return isDuplicate = true for _is_duplicate_title check with a duplicate title', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200)
        .then(({ body }) =>
          supertest
            .post(`${SAVED_QUERY_BASE_URL}/_is_duplicate_title`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send({ title: body.attributes.title })
            .expect(200)
            .then(({ body: body2 }) => {
              expect(body2.isDuplicate).to.be(true);
            })
        ));

    it('should return isDuplicate = false for _is_duplicate_title check with a duplicate title and matching ID', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200)
        .then(({ body }) =>
          supertest
            .post(`${SAVED_QUERY_BASE_URL}/_is_duplicate_title`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send({ title: body.attributes.title, id: body.id })
            .expect(200)
            .then(({ body: body2 }) => {
              expect(body2.isDuplicate).to.be(false);
            })
        ));

    it('should return isDuplicate = false for _is_duplicate_title check with a unique title', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(mockSavedQuery)
        .expect(200)
        .then(() =>
          supertest
            .post(`${SAVED_QUERY_BASE_URL}/_is_duplicate_title`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send({ title: 'my unique title' })
            .expect(200)
            .then(({ body }) => {
              expect(body.isDuplicate).to.be(false);
            })
        ));
  });
}
