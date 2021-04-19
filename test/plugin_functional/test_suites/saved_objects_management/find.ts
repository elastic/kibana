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
      it('returns saved objects with importableAndExportable types', async () =>
        await supertest
          .get(
            '/api/kibana/management/saved_objects/_find?type=test-hidden-importable-exportable&fields=title'
          )
          .set('kbn-xsrf', 'true')
          .expect(200)
          .then((resp) => {
            expect(
              resp.body.saved_objects.map((so: { id: string; type: string }) => ({
                id: so.id,
                type: so.type,
              }))
            ).to.eql([
              {
                type: 'test-hidden-importable-exportable',
                id: 'ff3733a0-9fty-11e7-ahb3-3dcb94193fab',
              },
            ]);
          }));

      it('returns empty response for non importableAndExportable types', async () =>
        await supertest
          .get(
            '/api/kibana/management/saved_objects/_find?type=test-hidden-non-importable-exportable'
          )
          .set('kbn-xsrf', 'true')
          .expect(200)
          .then((resp) => {
            expect(resp.body.saved_objects).to.eql([]);
          }));
    });
  });
}
