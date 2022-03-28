/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { getErrorCodeFromErrorReason } from '../../../../src/plugins/data_view_field_editor/public/lib/runtime_field_validation';
import { FtrProviderContext } from '../../ftr_provider_context';
import { API_BASE_PATH } from './constants';

const INDEX_NAME = 'api-integration-test-field-preview';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  const createIndex = async () => {
    await es.indices.create({
      index: INDEX_NAME,
      body: {
        mappings: {
          properties: {
            foo: {
              type: 'integer',
            },
            bar: {
              type: 'keyword',
            },
          },
        },
      },
    });
  };

  const deleteIndex = async () => {
    await es.indices.delete({
      index: INDEX_NAME,
    });
  };

  describe('Field preview', function () {
    before(async () => await createIndex());
    after(async () => await deleteIndex());

    describe('should return the script value', () => {
      const document = { foo: 1, bar: 'hello' };

      const tests = [
        {
          context: 'keyword_field',
          script: {
            source: 'emit("test")',
          },
          expected: 'test',
        },
        {
          context: 'long_field',
          script: {
            source: 'emit(doc["foo"].value + 1)',
          },
          expected: 2,
        },
        {
          context: 'keyword_field',
          script: {
            source: 'emit(doc["bar"].value + " world")',
          },
          expected: 'hello world',
        },
      ];

      tests.forEach((test) => {
        it(`> ${test.context}`, async () => {
          const payload = {
            script: test.script,
            document,
            context: test.context,
            index: INDEX_NAME,
          };

          const { body: response } = await supertest
            .post(`${API_BASE_PATH}/field_preview`)
            .send(payload)
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          expect(response.values).eql([test.expected]);
        });
      });
    });

    describe('payload validation', () => {
      it('should require a script', async () => {
        await supertest
          .post(`${API_BASE_PATH}/field_preview`)
          .send({
            context: 'keyword_field',
            index: INDEX_NAME,
          })
          .set('kbn-xsrf', 'xxx')
          .expect(400);
      });

      it('should require a context', async () => {
        await supertest
          .post(`${API_BASE_PATH}/field_preview`)
          .send({
            script: { source: 'emit("hello")' },
            index: INDEX_NAME,
          })
          .set('kbn-xsrf', 'xxx')
          .expect(400);
      });

      it('should require an index', async () => {
        await supertest
          .post(`${API_BASE_PATH}/field_preview`)
          .send({
            script: { source: 'emit("hello")' },
            context: 'keyword_field',
          })
          .set('kbn-xsrf', 'xxx')
          .expect(400);
      });
    });

    describe('Error messages', () => {
      // As ES does not return error codes we will add a test to make sure its error message string
      // does not change overtime as we rely on it to extract our own error code.
      // If this test fail we'll need to update the "getErrorCodeFromErrorReason()" handler
      it('should detect a script casting error', async () => {
        const { body: response } = await supertest
          .post(`${API_BASE_PATH}/field_preview`)
          .send({
            script: { source: 'emit(123)' }, // We send a long but the type is "keyword"
            context: 'keyword_field',
            index: INDEX_NAME,
          })
          .set('kbn-xsrf', 'xxx');

        const errorCode = getErrorCodeFromErrorReason(response.error?.caused_by?.reason);

        expect(errorCode).be('CAST_ERROR');
      });
    });
  });
}
