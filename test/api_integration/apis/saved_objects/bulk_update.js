/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import _ from 'lodash';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
  const esArchiver = getService('esArchiver');

  describe('bulkUpdate', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));
      it('should return 200', async () => {
        const response = await supertest
          .put(`/api/saved_objects/_bulk_update`)
          .send([
            {
              type: 'visualization',
              id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
              attributes: {
                title: 'An existing visualization',
              },
            },
            {
              type: 'dashboard',
              id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              attributes: {
                title: 'An existing dashboard',
              },
            },
          ])
          .expect(200);

        const {
          saved_objects: [firstObject, secondObject],
        } = response.body;

        // loose ISO8601 UTC time with milliseconds validation
        expect(firstObject)
          .to.have.property('updated_at')
          .match(/^[\d-]{10}T[\d:\.]{12}Z$/);
        expect(_.omit(firstObject, ['updated_at'])).to.eql({
          id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          type: 'visualization',
          version: firstObject.version,
          attributes: {
            title: 'An existing visualization',
          },
          namespaces: ['default'],
        });

        expect(secondObject)
          .to.have.property('updated_at')
          .match(/^[\d-]{10}T[\d:\.]{12}Z$/);
        expect(_.omit(secondObject, ['updated_at'])).to.eql({
          id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          type: 'dashboard',
          version: secondObject.version,
          attributes: {
            title: 'An existing dashboard',
          },
          namespaces: ['default'],
        });
      });

      it('does not pass references if omitted', async () => {
        const {
          body: {
            saved_objects: [visObject, dashObject],
          },
        } = await supertest.post(`/api/saved_objects/_bulk_get`).send([
          {
            type: 'visualization',
            id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          },
          {
            type: 'dashboard',
            id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          },
        ]);

        const response = await supertest
          .put(`/api/saved_objects/_bulk_update`)
          .send([
            {
              type: 'visualization',
              id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
              attributes: {
                title: 'Changed title but nothing else',
              },
              version: visObject.version,
            },
            {
              type: 'dashboard',
              id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              attributes: {
                title: 'Changed title and references',
              },
              version: dashObject.version,
              references: [{ id: 'foo', name: 'Foo', type: 'visualization' }],
            },
          ])
          .expect(200);

        const {
          saved_objects: [firstUpdatedObject, secondUpdatedObject],
        } = response.body;
        expect(firstUpdatedObject).to.not.have.property('error');
        expect(secondUpdatedObject).to.not.have.property('error');

        const {
          body: {
            saved_objects: [visObjectAfterUpdate, dashObjectAfterUpdate],
          },
        } = await supertest.post(`/api/saved_objects/_bulk_get`).send([
          {
            type: 'visualization',
            id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          },
          {
            type: 'dashboard',
            id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          },
        ]);

        expect(visObjectAfterUpdate.references).to.eql(visObject.references);
        expect(dashObjectAfterUpdate.references).to.eql([
          { id: 'foo', name: 'Foo', type: 'visualization' },
        ]);
      });

      it('passes empty references array if empty references array is provided', async () => {
        const {
          body: {
            saved_objects: [{ version }],
          },
        } = await supertest.post(`/api/saved_objects/_bulk_get`).send([
          {
            type: 'visualization',
            id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          },
        ]);

        await supertest
          .put(`/api/saved_objects/_bulk_update`)
          .send([
            {
              type: 'visualization',
              id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
              attributes: {
                title: 'Changed title but nothing else',
              },
              version,
              references: [],
            },
          ])
          .expect(200);

        const {
          body: {
            saved_objects: [visObjectAfterUpdate],
          },
        } = await supertest.post(`/api/saved_objects/_bulk_get`).send([
          {
            type: 'visualization',
            id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          },
        ]);

        expect(visObjectAfterUpdate.references).to.eql([]);
      });

      describe('unknown id', () => {
        it('should return a generic 404', async () => {
          const response = await supertest
            .put(`/api/saved_objects/_bulk_update`)
            .send([
              {
                type: 'visualization',
                id: 'not an id',
                attributes: {
                  title: 'An existing visualization',
                },
              },
              {
                type: 'dashboard',
                id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                attributes: {
                  title: 'An existing dashboard',
                },
              },
            ])
            .expect(200);

          const {
            saved_objects: [missingObject, updatedObject],
          } = response.body;

          // loose ISO8601 UTC time with milliseconds validation
          expect(missingObject).eql({
            type: 'visualization',
            id: 'not an id',
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [visualization/not an id] not found',
            },
          });

          expect(updatedObject)
            .to.have.property('updated_at')
            .match(/^[\d-]{10}T[\d:\.]{12}Z$/);
          expect(_.omit(updatedObject, ['updated_at', 'version'])).to.eql({
            id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
            type: 'dashboard',
            attributes: {
              title: 'An existing dashboard',
            },
            namespaces: ['default'],
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

      it('should return generic 404', async () => {
        const response = await supertest
          .put(`/api/saved_objects/_bulk_update`)
          .send([
            {
              type: 'visualization',
              id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
              attributes: {
                title: 'An existing visualization',
              },
            },
            {
              type: 'dashboard',
              id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              attributes: {
                title: 'An existing dashboard',
              },
            },
          ])
          .expect(200);

        const {
          saved_objects: [firstObject, secondObject],
        } = response.body;

        expect(firstObject).to.eql({
          id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          type: 'visualization',
          error: {
            statusCode: 404,
            error: 'Not Found',
            message: 'Saved object [visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab] not found',
          },
        });

        expect(secondObject).to.eql({
          id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          type: 'dashboard',
          error: {
            statusCode: 404,
            error: 'Not Found',
            message: 'Saved object [dashboard/be3733a0-9efe-11e7-acb3-3dab96693fab] not found',
          },
        });
      });
    });
  });
}
