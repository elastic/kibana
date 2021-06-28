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

  describe('delete', () => {
    before(() =>
      esArchiver.load(
        'test/functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
      )
    );
    after(() =>
      esArchiver.unload(
        'test/functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
      )
    );

    it('should return generic 404 when trying to delete a doc with importableAndExportable types', async () =>
      await supertest
        .delete(
          `/api/saved_objects/test-hidden-importable-exportable/ff3733a0-9fty-11e7-ahb3-3dcb94193fab`
        )
        .set('kbn-xsrf', 'true')
        .expect(404)
        .then((resp) => {
          expect(resp.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message:
              'Saved object [test-hidden-importable-exportable/ff3733a0-9fty-11e7-ahb3-3dcb94193fab] not found',
          });
        }));

    it('returns empty response for non importableAndExportable types', async () =>
      await supertest
        .delete(
          `/api/saved_objects/test-hidden-non-importable-exportable/op3767a1-9rcg-53u7-jkb3-3dnb74193awc`
        )
        .set('kbn-xsrf', 'true')
        .expect(404)
        .then((resp) => {
          expect(resp.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message:
              'Saved object [test-hidden-non-importable-exportable/op3767a1-9rcg-53u7-jkb3-3dnb74193awc] not found',
          });
        }));
  });
}
