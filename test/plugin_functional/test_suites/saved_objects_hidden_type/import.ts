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

  describe('import', () => {
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

    it('imports objects with importableAndExportable type', async () => {
      const fileBuffer = Buffer.from(
        '{"id":"some-id-1","type":"test-hidden-importable-exportable","attributes":{"title":"my title"},"references":[]}',
        'utf8'
      );
      await supertest
        .post('/api/saved_objects/_import')
        .set('kbn-xsrf', 'true')
        .attach('file', fileBuffer, 'export.ndjson')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            successCount: 1,
            success: true,
            warnings: [],
            successResults: [
              {
                type: 'test-hidden-importable-exportable',
                id: 'some-id-1',
                meta: {
                  title: 'my title',
                },
              },
            ],
          });
        });
    });

    it('does not import objects with non importableAndExportable type', async () => {
      const fileBuffer = Buffer.from(
        '{"id":"some-id-1","type":"test-hidden-non-importable-exportable","attributes":{"title":"my title"},"references":[]}',
        'utf8'
      );
      await supertest
        .post('/api/saved_objects/_import')
        .set('kbn-xsrf', 'true')
        .attach('file', fileBuffer, 'export.ndjson')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            successCount: 0,
            success: false,
            warnings: [],
            errors: [
              {
                id: 'some-id-1',
                type: 'test-hidden-non-importable-exportable',
                meta: {
                  title: 'my title',
                },
                error: {
                  type: 'unsupported_type',
                },
              },
            ],
          });
        });
    });
  });
}
