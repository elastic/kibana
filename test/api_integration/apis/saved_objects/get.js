/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
  const esArchiver = getService('esArchiver');

  describe('get', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200', async () =>
        await supertest
          .get(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
              type: 'visualization',
              updated_at: '2017-09-21T18:51:23.794Z',
              version: resp.body.version,
              migrationVersion: resp.body.migrationVersion,
              attributes: {
                title: 'Count of requests',
                description: '',
                version: 1,
                // cheat for some of the more complex attributes
                visState: resp.body.attributes.visState,
                uiStateJSON: resp.body.attributes.uiStateJSON,
                kibanaSavedObjectMeta: resp.body.attributes.kibanaSavedObjectMeta,
              },
              references: [
                {
                  type: 'index-pattern',
                  name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                  id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                },
              ],
              namespaces: ['default'],
            });
            expect(resp.body.migrationVersion).to.be.ok();
          }));

      describe('doc does not exist', () => {
        it('should return same generic error as when index does not exist', async () =>
          await supertest
            .get(`/api/saved_objects/visualization/foobar`)
            .expect(404)
            .then((resp) => {
              expect(resp.body).to.eql({
                error: 'Not Found',
                message: 'Saved object [visualization/foobar] not found',
                statusCode: 404,
              });
            }));
      });
    });

    describe('without kibana index', () => {
      before(
        async () =>
          // just in case the kibana server has recreated it
          await es.indices.delete({
            index: '.kibana',
            ignore: [404],
          })
      );

      it('should return basic 404 without mentioning index', async () =>
        await supertest
          .get('/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab')
          .expect(404)
          .then((resp) => {
            expect(resp.body).to.eql({
              error: 'Not Found',
              message:
                'Saved object [visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab] not found',
              statusCode: 404,
            });
          }));
    });
  });
}
