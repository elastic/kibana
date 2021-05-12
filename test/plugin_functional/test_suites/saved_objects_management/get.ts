/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get', () => {
    describe('saved objects with hidden type', () => {
      before(() =>
        esArchiver.load(
          '../functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
        )
      );
      after(() =>
        esArchiver.unload(
          '../functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
        )
      );
      const hiddenTypeExportableImportable =
        'test-hidden-importable-exportable/ff3733a0-9fty-11e7-ahb3-3dcb94193fab';
      const hiddenTypeNonExportableImportable =
        'test-hidden-non-importable-exportable/op3767a1-9rcg-53u7-jkb3-3dnb74193awc';

      it('should return 200 for hidden types that are importableAndExportable', async () =>
        await supertest
          .get(`/api/kibana/management/saved_objects/${hiddenTypeExportableImportable}`)
          .set('kbn-xsrf', 'true')
          .expect(200)
          .then((resp) => {
            const { body } = resp;
            const { type, id, meta } = body;
            expect(type).to.eql('test-hidden-importable-exportable');
            expect(id).to.eql('ff3733a0-9fty-11e7-ahb3-3dcb94193fab');
            expect(meta).to.not.equal(undefined);
          }));

      it('should return 404 for hidden types that are not importableAndExportable', async () =>
        await supertest
          .get(`/api/kibana/management/saved_objects/${hiddenTypeNonExportableImportable}`)
          .set('kbn-xsrf', 'true')
          .expect(404));
    });
  });
}
