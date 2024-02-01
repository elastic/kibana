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

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  void SAVED_QUERY_BASE_URL;

  describe('Saved queries API', function () {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
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
        .send({ ...mockSavedQuery, title: 'my title 2' })
        .expect(200)
        .then(() =>
          supertest
            .post(`${SAVED_QUERY_BASE_URL}/_create`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send({ ...mockSavedQuery, title: 'my title 2' })
            .expect(400)
        ));

    it('should return 200 for update saved query', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          ...mockSavedQuery,
          title: 'my old title',
        })
        .expect(200)
        .then(({ body }) =>
          supertest
            .put(`${SAVED_QUERY_BASE_URL}/${body.id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send({
              ...mockSavedQuery,
              title: 'my new title',
            })
            .expect(200)
            .then((res) => {
              expect(res.body.id).to.be(body.id);
              expect(res.body.attributes.title).to.be('my new title');
            })
        ));

    it('should return 404 for update non-existent saved query', () =>
      supertest
        .put(`${SAVED_QUERY_BASE_URL}/invalid_id`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          ...mockSavedQuery,
          title: 'my non-existent title',
        })
        .expect(404));

    it('should return 400 for update saved query with duplicate title', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          ...mockSavedQuery,
          title: 'my title 3',
        })
        .expect(200)
        .then(({ body }) =>
          supertest
            .post(`${SAVED_QUERY_BASE_URL}/_create`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send({ ...mockSavedQuery, title: 'my title 4' })
            .expect(200)
            .then(() =>
              supertest
                .put(`${SAVED_QUERY_BASE_URL}/${body.id}`)
                .set(ELASTIC_HTTP_VERSION_HEADER, '1')
                .send({ ...mockSavedQuery, title: 'my title 4' })
                .expect(400)
            )
        ));

    it('should return 200 for get saved query', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          ...mockSavedQuery,
          title: 'my title 5',
        })
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

    it('should return 200 for find saved queries', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({})
        .expect(200));

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
        .send({
          ...mockSavedQuery,
          title: 'my title 6',
        })
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
        .post(`${SAVED_QUERY_BASE_URL}/_is_duplicate_title`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ title: 'my title' })
        .expect(200)
        .then(({ body }) => {
          expect(body.isDuplicate).to.be(true);
        }));

    it('should return isDuplicate = false for _is_duplicate_title check with a duplicate title and matching ID', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_create`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          ...mockSavedQuery,
          title: 'my title 7',
        })
        .expect(200)
        .then(({ body }) =>
          supertest
            .post(`${SAVED_QUERY_BASE_URL}/_is_duplicate_title`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send({ title: 'my title 7', id: body.id })
            .expect(200)
            .then(({ body }) => {
              expect(body.isDuplicate).to.be(false);
            })
        ));

    it('should return isDuplicate = false for _is_duplicate_title check with a unique title', () =>
      supertest
        .post(`${SAVED_QUERY_BASE_URL}/_is_duplicate_title`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({ title: 'my unique title' })
        .expect(200)
        .then(({ body }) => {
          expect(body.isDuplicate).to.be(false);
        }));
  });
}
