/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('update', () => {
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

    it('handles upsert', async () => {
      await supertest
        .put(`/api/saved_objects/visualization/upserted-viz`)
        .send({
          attributes: {
            title: 'foo',
          },
          upsert: {
            title: 'upserted title',
            description: 'upserted description',
          },
        })
        .expect(200);

      const { body: upserted } = await supertest
        .get(`/api/saved_objects/visualization/upserted-viz`)
        .expect(200);

      expect(upserted.attributes).to.eql({
        title: 'upserted title',
        description: 'upserted description',
      });

      await supertest
        .put(`/api/saved_objects/visualization/upserted-viz`)
        .send({
          attributes: {
            title: 'foobar',
          },
          upsert: {
            description: 'new upserted description',
            version: 9000,
          },
        })
        .expect(200);

      const { body: notUpserted } = await supertest
        .get(`/api/saved_objects/visualization/upserted-viz`)
        .expect(200);

      expect(notUpserted.attributes).to.eql({
        title: 'foobar',
        description: 'upserted description',
      });
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
}
