/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import _ from 'lodash';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('bulkUpdate', () => {
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
      const response = await supertest
        .put(`/api/saved_objects/_bulk_update`)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
}
