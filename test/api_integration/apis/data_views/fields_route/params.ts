/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INITIAL_REST_VERSION_INTERNAL } from '@kbn/data-views-plugin/server/constants';
import { FIELDS_PATH } from '@kbn/data-views-plugin/common/constants';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const randomness = getService('randomness');

  describe('params', () => {
    before(() =>
      esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index')
    );
    after(() =>
      esArchiver.unload('test/api_integration/fixtures/es_archiver/index_patterns/basic_index')
    );

    it('requires a pattern query param', () =>
      supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(400));

    it('accepts include_unmapped param', () =>
      supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({
          pattern: '*',
          include_unmapped: true,
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(200));

    it('rejects unexpected query params', () =>
      supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({
          pattern: randomness.word(),
          [randomness.word()]: randomness.word(),
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(400));

    describe('fields', () => {
      it('accepts a JSON formatted fields query param', () =>
        supertest
          .get(FIELDS_PATH)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query({
            pattern: '*',
            fields: JSON.stringify(['baz']),
            apiVersion: INITIAL_REST_VERSION_INTERNAL,
          })
          .expect(200));

      it('accepts meta_fields query param in string array', () =>
        supertest
          .get(FIELDS_PATH)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query({
            pattern: '*',
            fields: ['baz', 'foo'],
            apiVersion: INITIAL_REST_VERSION_INTERNAL,
          })
          .expect(200));

      it('accepts single array fields query param', () =>
        supertest
          .get(FIELDS_PATH)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query({
            pattern: '*',
            fields: ['baz'],
            apiVersion: INITIAL_REST_VERSION_INTERNAL,
          })
          .expect(200));

      it('accepts single fields query param', () =>
        supertest
          .get(FIELDS_PATH)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query({
            pattern: '*',
            fields: 'baz',
            apiVersion: INITIAL_REST_VERSION_INTERNAL,
          })
          .expect(200));

      it('rejects a comma-separated list of fields', () =>
        supertest
          .get(FIELDS_PATH)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query({
            pattern: '*',
            fields: 'foo,bar',
            apiVersion: INITIAL_REST_VERSION_INTERNAL,
          })
          .expect(400));
    });

    describe('meta_fields', () => {
      it('accepts a JSON formatted meta_fields query param', () =>
        supertest
          .get(FIELDS_PATH)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query({
            pattern: '*',
            meta_fields: JSON.stringify(['meta']),
            apiVersion: INITIAL_REST_VERSION_INTERNAL,
          })
          .expect(200));

      it('accepts meta_fields query param in string array', () =>
        supertest
          .get(FIELDS_PATH)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query({
            pattern: '*',
            meta_fields: ['_id', 'meta'],
            apiVersion: INITIAL_REST_VERSION_INTERNAL,
          })
          .expect(200));

      it('accepts single meta_fields query param', () =>
        supertest
          .get(FIELDS_PATH)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query({
            pattern: '*',
            meta_fields: ['_id'],
            apiVersion: INITIAL_REST_VERSION_INTERNAL,
          })
          .expect(200));

      it('rejects a comma-separated list of meta_fields', () =>
        supertest
          .get(FIELDS_PATH)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query({
            pattern: '*',
            meta_fields: 'foo,bar',
            apiVersion: INITIAL_REST_VERSION_INTERNAL,
          })
          .expect(400));
    });
  });
}
