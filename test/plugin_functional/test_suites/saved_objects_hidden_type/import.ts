/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('import', () => {
    before(() =>
      es.bulk({
        refresh: 'wait_for',
        body: fs
          .readFileSync(
            path.resolve(__dirname, '../saved_objects_management/bulk/hidden_saved_objects.ndjson')
          )
          .toString()
          .split('\n'),
      })
    );

    after(() =>
      es.deleteByQuery({
        index: '.kibana',
        body: {
          query: {
            terms: {
              type: ['test-hidden-importable-exportable', 'test-hidden-non-importable-exportable'],
            },
          },
        },
      })
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
                title: 'my title',
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
