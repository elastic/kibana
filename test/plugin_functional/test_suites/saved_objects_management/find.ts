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

  describe('find', () => {
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

    describe('saved objects with hidden types', () => {
      it('returns saved objects with importableAndExportable types', async () =>
        await supertest
          .get(
            '/api/kibana/management/saved_objects/_find?type=test-hidden-importable-exportable&fields=title'
          )
          .set('kbn-xsrf', 'true')
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              page: 1,
              per_page: 20,
              total: 1,
              saved_objects: [
                {
                  type: 'test-hidden-importable-exportable',
                  id: 'ff3733a0-9fty-11e7-ahb3-3dcb94193fab',
                  attributes: {
                    title: 'Hidden Saved object type that is importable/exportable.',
                  },
                  references: [],
                  updated_at: '2021-02-11T18:51:23.794Z',
                  version: 'WzIsMl0=',
                  namespaces: ['default'],
                  score: 0,
                  meta: {
                    namespaceType: 'single',
                  },
                },
              ],
            });
          }));

      it('returns empty response for non importableAndExportable types', async () =>
        await supertest
          .get(
            '/api/kibana/management/saved_objects/_find?type=test-hidden-non-importable-exportable'
          )
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
  });
}
