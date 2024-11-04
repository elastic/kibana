/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('find', () => {
    before(async () => {
      await esArchiver.load(
        'test/functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
      );
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/saved_objects_management/hidden_saved_objects'
      );
    });
    after(async () => {
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
      );
      await kibanaServer.savedObjects.clean({
        types: ['test-hidden-importable-exportable'],
      });
    });

    it('returns empty response for importableAndExportable types', async () =>
      await supertest
        .get('/api/saved_objects/_find?type=test-hidden-importable-exportable')
        .set('kbn-xsrf', 'true')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            page: 1,
            per_page: 20,
            total: 0,
            saved_objects: [],
          });
        }));

    it('returns empty response for non importableAndExportable types', async () =>
      await supertest
        .get('/api/saved_objects/_find?type=test-hidden-non-importable-exportable')
        .set('kbn-xsrf', 'true')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            page: 1,
            per_page: 20,
            total: 0,
            saved_objects: [],
          });
        }));
  });
}
