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
  const apiUrl = '/api/kibana/management/saved_objects/scroll/counts';

  describe('scroll_count', () => {
    describe('saved objects with hidden type', () => {
      before(() =>
        es.bulk({
          refresh: 'wait_for',
          body: fs
            .readFileSync(path.resolve(__dirname, './bulk/hidden_saved_objects.ndjson'))
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
                type: [
                  'test-hidden-importable-exportable',
                  'test-hidden-non-importable-exportable',
                ],
              },
            },
          },
        })
      );

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
