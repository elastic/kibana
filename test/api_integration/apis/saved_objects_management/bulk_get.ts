/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { Response } from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('_bulk_get', () => {
    const URL = '/api/kibana/management/saved_objects/_bulk_get';
    const validObject = { type: 'visualization', id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab' };
    const invalidObject = { type: 'wigwags', id: 'foo' };

    before(() =>
      kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      )
    );
    after(() =>
      kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      )
    );

    it('should return 200 for object that exists and inject metadata', async () =>
      await supertest
        .post(URL)
        .send([validObject])
        .expect(200)
        .then(({ body }: Response) => {
          const [{ type, id, meta, error }] = body;
          expect(type).to.eql(validObject.type);
          expect(id).to.eql(validObject.id);
          expect(meta).to.not.equal(undefined);
          expect(error).to.equal(undefined);
        }));

    it('should return error for invalid object type', async () =>
      await supertest
        .post(URL)
        .send([invalidObject])
        .expect(200)
        .then(({ body }: Response) => {
          const [{ type, id, error }] = body;
          expect(type).to.eql(invalidObject.type);
          expect(id).to.eql(invalidObject.id);
          expect(error).to.eql({
            message: `Unsupported saved object type: '${invalidObject.type}': Bad Request`,
            statusCode: 400,
            error: 'Bad Request',
          });
        }));
  });
}
