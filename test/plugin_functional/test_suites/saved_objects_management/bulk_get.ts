/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { Response } from 'supertest';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('_bulk_get', () => {
    describe('saved objects with hidden type', () => {
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
      const URL = '/api/kibana/management/saved_objects/_bulk_get';
      const hiddenTypeExportableImportable = {
        type: 'test-hidden-importable-exportable',
        id: 'ff3733a0-9fty-11e7-ahb3-3dcb94193fab',
      };
      const hiddenTypeNonExportableImportable = {
        type: 'test-hidden-non-importable-exportable',
        id: 'op3767a1-9rcg-53u7-jkb3-3dnb74193awc',
      };

      function expectSuccess(index: number, { body }: Response) {
        const { type, id, meta, error } = body[index];
        expect(type).to.eql(hiddenTypeExportableImportable.type);
        expect(id).to.eql(hiddenTypeExportableImportable.id);
        expect(meta).to.not.equal(undefined);
        expect(error).to.equal(undefined);
      }

      function expectBadRequest(index: number, { body }: Response) {
        const { type, id, error } = body[index];
        expect(type).to.eql(hiddenTypeNonExportableImportable.type);
        expect(id).to.eql(hiddenTypeNonExportableImportable.id);
        expect(error).to.eql({
          message: `Unsupported saved object type: '${hiddenTypeNonExportableImportable.type}': Bad Request`,
          statusCode: 400,
          error: 'Bad Request',
        });
      }

      it('should return 200 for hidden types that are importableAndExportable', async () =>
        await supertest
          .post(URL)
          .send([hiddenTypeExportableImportable])
          .set('kbn-xsrf', 'true')
          .expect(200)
          .then((response: Response) => {
            expect(response.body).to.have.length(1);
            expectSuccess(0, response);
          }));

      it('should return error for hidden types that are not importableAndExportable', async () =>
        await supertest
          .post(URL)
          .send([hiddenTypeNonExportableImportable])
          .set('kbn-xsrf', 'true')
          .expect(200)
          .then((response: Response) => {
            expect(response.body).to.have.length(1);
            expectBadRequest(0, response);
          }));

      it('should return mix of successes and errors', async () =>
        await supertest
          .post(URL)
          .send([hiddenTypeExportableImportable, hiddenTypeNonExportableImportable])
          .set('kbn-xsrf', 'true')
          .expect(200)
          .then((response: Response) => {
            expect(response.body).to.have.length(2);
            expectSuccess(0, response);
            expectBadRequest(1, response);
          }));
    });
  });
}
