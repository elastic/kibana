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

  describe('get', () => {
    const existingObject = 'visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab';
    const nonexistentObject = 'wigwags/foo';

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

    it('should return 200 for object that exists and inject metadata', async () =>
      await supertest
        .get(`/api/kibana/management/saved_objects/${existingObject}`)
        .expect(200)
        .then((resp: Response) => {
          const { body } = resp;
          const { type, id, meta } = body;
          expect(type).to.eql('visualization');
          expect(id).to.eql('dd7caf20-9efd-11e7-acb3-3dab96693fab');
          expect(meta).to.not.equal(undefined);
        }));

    it('should return 404 for object that does not exist', async () =>
      await supertest.get(`/api/kibana/management/saved_objects/${nonexistentObject}`).expect(404));
  });
}
