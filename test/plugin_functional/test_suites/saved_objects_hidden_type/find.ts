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

  describe('find', () => {
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

    it('returns empty response for importableAndExportable types', async () =>
      await supertest
        .get('/api/saved_objects/_find?type=test-hidden-importable-exportable&fields=title')
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
        .get('/api/saved_objects/_find?type=test-hidden-non-importable-exportable&fields=title')
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
