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
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get', () => {
    const existingObject = 'visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab';
    const hiddenTypeExportableImportable =
      'test-hidden-importable-exportable/ff3733a0-9fty-11e7-ahb3-3dcb94193fab';
    const hiddenTypeNonExportableImportable =
      'test-hidden-non-importable-exportable/op3767a1-9rcg-53u7-jkb3-3dnb74193awc';
    const nonexistentObject = 'wigwags/foo';

    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

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

      it('should return 200 for hidden types that are importableAndExportable', async () =>
        await supertest
          .get(`/api/kibana/management/saved_objects/${hiddenTypeExportableImportable}`)
          .expect(200)
          .then((resp: Response) => {
            const { body } = resp;
            const { type, id, meta } = body;
            expect(type).to.eql('test-hidden-importable-exportable');
            expect(id).to.eql('ff3733a0-9fty-11e7-ahb3-3dcb94193fab');
            expect(meta).to.not.equal(undefined);
          }));

      it('should return 404 for object that does not exist', async () =>
        await supertest
          .get(`/api/kibana/management/saved_objects/${nonexistentObject}`)
          .expect(404));

      it('should return 404 for hidden types that are not importableAndExportable', async () =>
        await supertest
          .get(`/api/kibana/management/saved_objects/${hiddenTypeNonExportableImportable}`)
          .expect(404));
    });

    describe('without kibana index', () => {
      before(
        async () =>
          // just in case the kibana server has recreated it
          await esDeleteAllIndices('.kibana*')
      );

      it('should return 404 for object that no longer exists', async () =>
        await supertest.get(`/api/kibana/management/saved_objects/${existingObject}`).expect(404));
    });
  });
}
