/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

function ndjsonToObject(input: string): string[] {
  return input.split('\n').map((str) => JSON.parse(str));
}

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('export', () => {
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

    it('exports objects with importableAndExportable types', async () =>
      await supertest
        .post('/api/saved_objects/_export')
        .set('kbn-xsrf', 'true')
        .send({
          type: ['test-hidden-importable-exportable'],
        })
        .expect(200)
        .then((resp) => {
          const objects = ndjsonToObject(resp.text);
          expect(objects).to.have.length(2);
          expect(objects[0]).to.have.property('id', 'ff3733a0-9fty-11e7-ahb3-3dcb94193fab');
          expect(objects[0]).to.have.property('type', 'test-hidden-importable-exportable');
        }));

    it('excludes objects with non importableAndExportable types', async () =>
      await supertest
        .post('/api/saved_objects/_export')
        .set('kbn-xsrf', 'true')
        .send({
          type: ['test-hidden-non-importable-exportable'],
        })
        .then((resp) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'Trying to export non-exportable type(s): test-hidden-non-importable-exportable',
          });
        }));
  });
}
