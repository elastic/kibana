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
  const apiUrl = '/api/kibana/management/saved_objects/scroll/counts';

  describe('scroll_count', () => {
    describe('saved objects with hidden type', () => {
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

      it('only counts hidden types that are importableAndExportable', async () => {
        const res = await supertest
          .post(apiUrl)
          .set('kbn-xsrf', 'true')
          .send({
            typesToInclude: [
              'test-hidden-non-importable-exportable',
              'test-hidden-importable-exportable',
            ],
          })
          .expect(200);

        expect(res.body).to.eql({
          'test-hidden-importable-exportable': 1,
          'test-hidden-non-importable-exportable': 0,
        });
      });
    });
  });
}
