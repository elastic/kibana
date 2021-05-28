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

function ndjsonToObject(input: string): string[] {
  return input.split('\n').map((str) => JSON.parse(str));
}

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('export', () => {
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
