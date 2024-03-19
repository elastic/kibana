/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { SavedQueryAttributes, SAVED_QUERY_BASE_URL } from '@kbn/data-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

// node scripts/functional_tests --config test/api_integration/config.js --grep="search session"

const mockSavedQuery: SavedQueryAttributes = {
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

  const createQuery = (query: Partial<typeof mockSavedQuery> = mockSavedQuery) =>
    supertest
      .post(`${SAVED_QUERY_BASE_URL}/_create`)
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .send(query);

  const updateQuery = (id: string, query: Partial<typeof mockSavedQuery> = mockSavedQuery) =>
    supertest
      .put(`${SAVED_QUERY_BASE_URL}/${id}`)
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .send(query);

  const deleteQuery = (id: string) =>
    supertest.delete(`${SAVED_QUERY_BASE_URL}/${id}`).set(ELASTIC_HTTP_VERSION_HEADER, '1');

  const getQuery = (id: string) =>
    supertest.get(`${SAVED_QUERY_BASE_URL}/${id}`).set(ELASTIC_HTTP_VERSION_HEADER, '1');

  const findQueries = (options: { search?: string; perPage?: number; page?: number } = {}) =>
    supertest
      .post(`${SAVED_QUERY_BASE_URL}/_find`)
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .send(options);

  const countQueries = () =>
    supertest.get(`${SAVED_QUERY_BASE_URL}/_count`).set(ELASTIC_HTTP_VERSION_HEADER, '1');

  const isDuplicateTitle = (title: string, id?: string) =>
    supertest
      .post(`${SAVED_QUERY_BASE_URL}/_is_duplicate_title`)
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .send({ title, id });

  describe('Saved queries API', function () {
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

    describe('create', () => {
      it('should return 200 for create saved query', () =>
        createQuery()
          .expect(200)
          .then(({ body }) => {
            expect(body.id).to.have.length(36);
            expect(body.attributes.title).to.be('my title');
            expect(body.attributes.description).to.be('my description');
          }));

      it('should return 400 for create invalid saved query', () =>
        createQuery({ description: 'my description' })
          .expect(400)
          .then(({ body }) => {
            expect(body.message).to.be(
              '[request body.title]: expected value of type [string] but got [undefined]'
            );
          }));

      it('should return 400 for create saved query with duplicate title', () =>
        createQuery()
          .expect(200)
          .then(() =>
            createQuery()
              .expect(400)
              .then(({ body }) => {
                expect(body.message).to.be('Query with title "my title" already exists');
              })
          ));

      it('should leave filters and timefilter undefined if not provided', () =>
        createQuery({ ...mockSavedQuery, filters: undefined, timefilter: undefined })
          .expect(200)
          .then(({ body }) =>
            getQuery(body.id)
              .expect(200)
              .then(({ body: body2 }) => {
                expect(body.attributes.filters).to.be(undefined);
                expect(body.attributes.timefilter).to.be(undefined);
                expect(body2.attributes.filters).to.be(undefined);
                expect(body2.attributes.timefilter).to.be(undefined);
              })
          ));
    });

    describe('update', () => {
      it('should return 200 for update saved query', () =>
        createQuery()
          .expect(200)
          .then(({ body }) =>
            updateQuery(body.id, {
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
        updateQuery('invalid_id').expect(404));

      it('should return 400 for update saved query with duplicate title', () =>
        createQuery()
          .expect(200)
          .then(({ body }) =>
            createQuery({ ...mockSavedQuery, title: 'my duplicate title' })
              .expect(200)
              .then(() =>
                updateQuery(body.id, { ...mockSavedQuery, title: 'my duplicate title' })
                  .expect(400)
                  .then(({ body: body2 }) => {
                    expect(body2.message).to.be(
                      'Query with title "my duplicate title" already exists'
                    );
                  })
              )
          ));

      it('should remove filters and timefilter if not provided', () =>
        createQuery({
          ...mockSavedQuery,
          filters: [{ meta: {}, query: {} }],
          timefilter: {
            from: 'now-7d',
            to: 'now',
            refreshInterval: {
              pause: false,
              value: 60000,
            },
          },
        })
          .expect(200)
          .then(({ body }) =>
            updateQuery(body.id, {
              ...mockSavedQuery,
              filters: undefined,
              timefilter: undefined,
            })
              .expect(200)
              .then(({ body: body2 }) =>
                getQuery(body2.id)
                  .expect(200)
                  .then(({ body: body3 }) => {
                    expect(body.attributes.filters).not.to.be(undefined);
                    expect(body.attributes.timefilter).not.to.be(undefined);
                    expect(body2.attributes.filters).to.be(undefined);
                    expect(body2.attributes.timefilter).to.be(undefined);
                    expect(body3.attributes.filters).to.be(undefined);
                    expect(body3.attributes.timefilter).to.be(undefined);
                  })
              )
          ));
    });

    describe('delete', () => {
      it('should return 200 for delete saved query', () =>
        createQuery()
          .expect(200)
          .then(({ body }) => deleteQuery(body.id).expect(200)));

      it('should return 404 for delete non-existent saved query', () =>
        deleteQuery('invalid_id').expect(404));
    });

    describe('get', () => {
      it('should return 200 for get saved query', () =>
        createQuery()
          .expect(200)
          .then(({ body }) =>
            getQuery(body.id)
              .expect(200)
              .then((res) => {
                expect(res.body.id).to.be(body.id);
                expect(res.body.attributes.title).to.be(body.attributes.title);
              })
          ));

      it('should return 404 for get non-existent saved query', () =>
        getQuery('invalid_id').expect(404));
    });

    describe('find', () => {
      it('should return 200 for find saved queries', () => findQueries().expect(200));

      it('should return 400 for bad find saved queries request', () =>
        findQueries({ foo: 'bar' } as any)
          .expect(400)
          .then(({ body }) => {
            expect(body.message).to.be('[request body.foo]: definition for this key is missing');
          }));

      it('should return expected queries for find saved queries', async () => {
        await createQuery().expect(200);

        const result = await createQuery({ ...mockSavedQuery, title: 'my title 2' }).expect(200);

        await findQueries()
          .expect(200)
          .then((res) => {
            expect(res.body.total).to.be(2);
            expect(res.body.savedQueries.length).to.be(2);
            expect(res.body.savedQueries.map((q: any) => q.attributes.title)).to.eql([
              'my title',
              'my title 2',
            ]);
          });

        await deleteQuery(result.body.id).expect(200);

        await findQueries()
          .expect(200)
          .then((res) => {
            expect(res.body.total).to.be(1);
            expect(res.body.savedQueries.length).to.be(1);
            expect(res.body.savedQueries.map((q: any) => q.attributes.title)).to.eql(['my title']);
          });
      });

      it('should return expected queries for find saved queries with a search', async () => {
        await createQuery().expect(200);
        await createQuery({ ...mockSavedQuery, title: 'my title 2' }).expect(200);

        const result = await createQuery({ ...mockSavedQuery, title: 'my title 2 again' }).expect(
          200
        );

        await findQueries({ search: 'itle 2' })
          .expect(200)
          .then((res) => {
            expect(res.body.total).to.be(2);
            expect(res.body.savedQueries.length).to.be(2);
            expect(res.body.savedQueries.map((q: any) => q.attributes.title)).to.eql([
              'my title 2',
              'my title 2 again',
            ]);
          });

        await deleteQuery(result.body.id).expect(200);

        await findQueries({ search: 'itle 2' })
          .expect(200)
          .then((res) => {
            expect(res.body.total).to.be(1);
            expect(res.body.savedQueries.length).to.be(1);
            expect(res.body.savedQueries.map((q: any) => q.attributes.title)).to.eql([
              'my title 2',
            ]);
          });
      });

      it('should support pagination for find saved queries', async () => {
        await createQuery().expect(200);
        await createQuery({ ...mockSavedQuery, title: 'my title 2' }).expect(200);
        await createQuery({ ...mockSavedQuery, title: 'my title 3' }).expect(200);

        await findQueries({ perPage: 2 })
          .expect(200)
          .then((res) => {
            expect(res.body.total).to.be(3);
            expect(res.body.savedQueries.length).to.be(2);
            expect(res.body.savedQueries.map((q: any) => q.attributes.title)).to.eql([
              'my title',
              'my title 2',
            ]);
          });

        await findQueries({ perPage: 2, page: 2 })
          .expect(200)
          .then((res) => {
            expect(res.body.total).to.be(3);
            expect(res.body.savedQueries.length).to.be(1);
            expect(res.body.savedQueries.map((q: any) => q.attributes.title)).to.eql([
              'my title 3',
            ]);
          });
      });

      it('should support pagination for find saved queries with a search', async () => {
        await createQuery().expect(200);
        await createQuery({ ...mockSavedQuery, title: 'my title 2' }).expect(200);
        await createQuery({ ...mockSavedQuery, title: 'my title 3' }).expect(200);
        await createQuery({ ...mockSavedQuery, title: 'not a match' }).expect(200);

        await findQueries({ perPage: 2, search: 'itle' })
          .expect(200)
          .then((res) => {
            expect(res.body.total).to.be(3);
            expect(res.body.savedQueries.length).to.be(2);
            expect(res.body.savedQueries.map((q: any) => q.attributes.title)).to.eql([
              'my title',
              'my title 2',
            ]);
          });

        await findQueries({ perPage: 2, page: 2, search: 'itle' })
          .expect(200)
          .then((res) => {
            expect(res.body.total).to.be(3);
            expect(res.body.savedQueries.length).to.be(1);
            expect(res.body.savedQueries.map((q: any) => q.attributes.title)).to.eql([
              'my title 3',
            ]);
          });
      });

      it('should support searching for queries containing special characters', async () => {
        await createQuery({ ...mockSavedQuery, title: 'query <> title' }).expect(200);

        await findQueries({ search: 'ry <> ti' })
          .expect(200)
          .then((res) => {
            expect(res.body.total).to.be(1);
            expect(res.body.savedQueries.length).to.be(1);
            expect(res.body.savedQueries.map((q: any) => q.attributes.title)).to.eql([
              'query <> title',
            ]);
          });
      });
    });

    describe('count', () => {
      it('should return 200 for saved query count', () => countQueries().expect(200));

      it('should return expected counts for saved query count', async () => {
        await countQueries()
          .expect(200)
          .then((res) => {
            expect(res.text).to.be('0');
          });

        await createQuery().expect(200);

        const result = await createQuery({ ...mockSavedQuery, title: 'my title 2' }).expect(200);

        await countQueries()
          .expect(200)
          .then((res) => {
            expect(res.text).to.be('2');
          });

        await deleteQuery(result.body.id).expect(200);

        await countQueries()
          .expect(200)
          .then((res) => {
            expect(res.text).to.be('1');
          });
      });
    });

    describe('isDuplicateTitle', () => {
      it('should return isDuplicate = true for _is_duplicate_title check with a duplicate title', () =>
        createQuery()
          .expect(200)
          .then(({ body }) =>
            isDuplicateTitle(body.attributes.title)
              .expect(200)
              .then(({ body: body2 }) => {
                expect(body2.isDuplicate).to.be(true);
              })
          ));

      it('should return isDuplicate = false for _is_duplicate_title check with a duplicate title and matching ID', () =>
        createQuery()
          .expect(200)
          .then(({ body }) =>
            isDuplicateTitle(body.attributes.title, body.id)
              .expect(200)
              .then(({ body: body2 }) => {
                expect(body2.isDuplicate).to.be(false);
              })
          ));

      it('should return isDuplicate = false for _is_duplicate_title check with a unique title', () =>
        createQuery()
          .expect(200)
          .then(() =>
            isDuplicateTitle('my unique title')
              .expect(200)
              .then(({ body }) => {
                expect(body.isDuplicate).to.be(false);
              })
          ));
    });
  });
}
