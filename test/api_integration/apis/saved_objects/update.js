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

  describe('update', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));
      it('should return 200', async () => {
        await supertest
          .put(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
          .send({
            attributes: {
              title: 'My second favorite vis',
            },
          })
          .expect(200)
          .then((resp) => {
            // loose uuid validation
            expect(resp.body)
              .to.have.property('id')
              .match(/^[0-9a-f-]{36}$/);

            // loose ISO8601 UTC time with milliseconds validation
            expect(resp.body)
              .to.have.property('updated_at')
              .match(/^[\d-]{10}T[\d:\.]{12}Z$/);

            expect(resp.body).to.eql({
              id: resp.body.id,
              type: 'visualization',
              updated_at: resp.body.updated_at,
              version: resp.body.version,
              attributes: {
                title: 'My second favorite vis',
              },
              namespaces: ['default'],
            });
          });
      });

      it('does not pass references if omitted', async () => {
        const resp = await supertest
          .put(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
          .send({
            attributes: {
              title: 'foo',
            },
          })
          .expect(200);

        expect(resp.body).not.to.have.property('references');
      });

      it('passes references if they are provided', async () => {
        const references = [{ id: 'foo', name: 'Foo', type: 'visualization' }];

        const resp = await supertest
          .put(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
          .send({
            attributes: {
              title: 'foo',
            },
            references,
          })
          .expect(200);

        expect(resp.body).to.have.property('references');
        expect(resp.body.references).to.eql(references);
      });

      it('passes empty references array if empty references array is provided', async () => {
        const resp = await supertest
          .put(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
          .send({
            attributes: {
              title: 'foo',
            },
            references: [],
          })
          .expect(200);

        expect(resp.body).to.have.property('references');
        expect(resp.body.references).to.eql([]);
      });

      describe('unknown id', () => {
        it('should return a generic 404', async () => {
          await supertest
            .put(`/api/saved_objects/visualization/not an id`)
            .send({
              attributes: {
                title: 'My second favorite vis',
              },
            })
            .expect(404)
            .then((resp) => {
              expect(resp.body).eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Saved object [visualization/not an id] not found',
              });
            });
        });
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

      it('should return generic 404', async () =>
        await supertest
          .put(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
          .send({
            attributes: {
              title: 'My second favorite vis',
            },
          })
          .expect(404)
          .then((resp) => {
            expect(resp.body).eql({
              statusCode: 404,
              error: 'Not Found',
              message:
                'Saved object [visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab] not found',
            });
          }));
    });
  });
}
