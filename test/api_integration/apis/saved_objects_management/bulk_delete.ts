/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { Response } from 'supertest';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('_bulk_delete', () => {
    const endpoint = '/internal/kibana/management/saved_objects/_bulk_delete';
    const validObject = { type: 'visualization', id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab' };
    const invalidObject = { type: 'wigwags', id: 'foo' };

    beforeEach(() =>
      kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      )
    );
    afterEach(() =>
      kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      )
    );

    function expectSuccess(index: number, { body }: Response) {
      const { type, id, error } = body[index];
      expect(type).to.eql(validObject.type);
      expect(id).to.eql(validObject.id);
      expect(error).to.equal(undefined);
    }

    function expectBadRequest(index: number, { body }: Response) {
      const { type, id, error } = body[index];
      expect(type).to.eql(invalidObject.type);
      expect(id).to.eql(invalidObject.id);
      expect(error).to.eql({
        message: `Unsupported saved object type: '${invalidObject.type}': Bad Request`,
        statusCode: 400,
        error: 'Bad Request',
      });
    }

    it('should return 200 for an existing object', async () =>
      await supertest
        .post(endpoint)
        .send([validObject])
        .expect(200)
        .then((response: Response) => {
          expect(response.body).to.have.length(1);
          expectSuccess(0, response);
        }));

    it('should return error for invalid object type', async () =>
      await supertest
        .post(endpoint)
        .send([invalidObject])
        .expect(200)
        .then((response: Response) => {
          expect(response.body).to.have.length(1);
          expectBadRequest(0, response);
        }));

    it('should return mix of successes and errors', async () =>
      await supertest
        .post(endpoint)
        .send([validObject, invalidObject])
        .expect(200)
        .then((response: Response) => {
          expect(response.body).to.have.length(2);
          expectSuccess(0, response);
          expectBadRequest(1, response);
        }));
  });
}
