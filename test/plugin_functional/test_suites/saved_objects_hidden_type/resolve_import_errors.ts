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

  describe('export', () => {
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

    it('resolves objects with importableAndExportable types', async () => {
      const fileBuffer = Buffer.from(
        '{"id":"ff3733a0-9fty-11e7-ahb3-3dcb94193fab","type":"test-hidden-importable-exportable","attributes":{"title":"new title!"},"references":[]}',
        'utf8'
      );

      await supertest
        .post('/api/saved_objects/_resolve_import_errors')
        .set('kbn-xsrf', 'true')
        .field(
          'retries',
          JSON.stringify([
            {
              id: 'ff3733a0-9fty-11e7-ahb3-3dcb94193fab',
              type: 'test-hidden-importable-exportable',
              overwrite: true,
            },
          ])
        )
        .attach('file', fileBuffer, 'import.ndjson')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            successCount: 1,
            success: true,
            warnings: [],
            successResults: [
              {
                type: 'test-hidden-importable-exportable',
                id: 'ff3733a0-9fty-11e7-ahb3-3dcb94193fab',
                meta: {
                  title: 'new title!',
                },
                overwrite: true,
                managed: false,
              },
            ],
          });
        });
    });

    it('rejects objects with non importableAndExportable types', async () => {
      const fileBuffer = Buffer.from(
        '{"id":"op3767a1-9rcg-53u7-jkb3-3dnb74193awc","type":"test-hidden-non-importable-exportable","attributes":{"title":"new title!"},"references":[]}',
        'utf8'
      );

      await supertest
        .post('/api/saved_objects/_resolve_import_errors')
        .set('kbn-xsrf', 'true')
        .field(
          'retries',
          JSON.stringify([
            {
              id: 'op3767a1-9rcg-53u7-jkb3-3dnb74193awc',
              type: 'test-hidden-non-importable-exportable',
              overwrite: true,
            },
          ])
        )
        .attach('file', fileBuffer, 'import.ndjson')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            successCount: 0,
            success: false,
            warnings: [],
            errors: [
              {
                id: 'op3767a1-9rcg-53u7-jkb3-3dnb74193awc',
                type: 'test-hidden-non-importable-exportable',
                meta: {
                  title: 'new title!',
                },
                error: {
                  type: 'unsupported_type',
                },
                overwrite: true,
              },
            ],
          });
        });
    });
  });
}
