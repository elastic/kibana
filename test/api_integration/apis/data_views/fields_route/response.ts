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
import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const esClient = getService('es');

  const ensureFieldsAreSorted = (resp: { body: { fields: { name: string } } }) => {
    expect(resp.body.fields).to.eql(sortBy(resp.body.fields, 'name'));
  };

  const testFields = [
    {
      type: 'boolean',
      esTypes: ['boolean'],
      searchable: true,
      aggregatable: true,
      name: 'bar',
      readFromDocValues: true,
      metadata_field: false,
    },
    {
      type: 'string',
      esTypes: ['text'],
      searchable: true,
      aggregatable: false,
      name: 'baz',
      readFromDocValues: false,
      metadata_field: false,
    },
    {
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      name: 'baz.keyword',
      readFromDocValues: true,
      subType: { multi: { parent: 'baz' } },
      metadata_field: false,
    },
    {
      type: 'number',
      esTypes: ['long'],
      searchable: true,
      aggregatable: true,
      name: 'foo',
      readFromDocValues: true,
      metadata_field: false,
    },
    {
      aggregatable: true,
      esTypes: ['keyword'],
      name: 'nestedField.child',
      readFromDocValues: true,
      searchable: true,
      subType: {
        nested: {
          path: 'nestedField',
        },
      },
      type: 'string',
      metadata_field: false,
    },
  ];

  describe('fields route response', () => {
    before(() =>
      esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index')
    );
    after(() =>
      esArchiver.unload('test/api_integration/fixtures/es_archiver/index_patterns/basic_index')
    );

    it('returns a flattened version of the fields in es', async () => {
      await supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({ pattern: 'basic_index', apiVersion: INITIAL_REST_VERSION_INTERNAL })
        .expect(200, {
          fields: testFields,
          indices: ['basic_index'],
        })
        .then(ensureFieldsAreSorted);
    });

    it('returns a single field as requested', async () => {
      await supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({
          pattern: 'basic_index',
          fields: ['bar'],
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(200, {
          fields: [testFields[0]],
          indices: ['basic_index'],
        });
    });

    it('returns a single field as requested with json encoding', async () => {
      await supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({
          pattern: 'basic_index',
          fields: JSON.stringify(['bar']),
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(200, {
          fields: [testFields[0]],
          indices: ['basic_index'],
        });
    });

    it('always returns a field for all passed meta fields', async () => {
      await supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({
          pattern: 'basic_index',
          meta_fields: ['_id', '_source', 'crazy_meta_field'],
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(200, {
          fields: [
            {
              aggregatable: false,
              name: '_id',
              esTypes: ['_id'],
              readFromDocValues: false,
              searchable: true,
              type: 'string',
              metadata_field: true,
            },
            {
              aggregatable: false,
              name: '_source',
              esTypes: ['_source'],
              readFromDocValues: false,
              searchable: false,
              type: '_source',
              metadata_field: true,
            },
            {
              type: 'boolean',
              esTypes: ['boolean'],
              searchable: true,
              aggregatable: true,
              name: 'bar',
              readFromDocValues: true,
              metadata_field: false,
            },
            {
              aggregatable: false,
              name: 'baz',
              esTypes: ['text'],
              readFromDocValues: false,
              searchable: true,
              type: 'string',
              metadata_field: false,
            },
            {
              type: 'string',
              esTypes: ['keyword'],
              searchable: true,
              aggregatable: true,
              name: 'baz.keyword',
              readFromDocValues: true,
              subType: { multi: { parent: 'baz' } },
              metadata_field: false,
            },
            {
              aggregatable: false,
              name: 'crazy_meta_field',
              readFromDocValues: false,
              searchable: false,
              type: 'string',
              metadata_field: true,
            },
            {
              type: 'number',
              esTypes: ['long'],
              searchable: true,
              aggregatable: true,
              name: 'foo',
              readFromDocValues: true,
              metadata_field: false,
            },
            {
              aggregatable: true,
              esTypes: ['keyword'],
              name: 'nestedField.child',
              readFromDocValues: true,
              searchable: true,
              subType: {
                nested: {
                  path: 'nestedField',
                },
              },
              type: 'string',
              metadata_field: false,
            },
          ],
          indices: ['basic_index'],
        })
        .then(ensureFieldsAreSorted);
    });

    it('can request fields by type', async () => {
      await supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({
          pattern: 'basic_index',
          field_types: 'boolean',
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(200, {
          fields: [testFields[0]],
          indices: ['basic_index'],
        });
    });

    it('can request fields by multiple types', async () => {
      await supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({
          pattern: 'basic_index',
          field_types: ['boolean', 'text'],
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(200, {
          fields: [testFields[0], testFields[1]],
          indices: ['basic_index'],
        });
    });

    it('returns fields when one pattern exists and the other does not', async () => {
      await supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({ pattern: 'bad_index,basic_index', apiVersion: INITIAL_REST_VERSION_INTERNAL })
        .expect(200, {
          fields: testFields,
          indices: ['basic_index'],
        });
    });

    it('returns 404 when neither exists', async () => {
      await supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({ pattern: 'bad_index,bad_index_2', apiVersion: INITIAL_REST_VERSION_INTERNAL })
        .expect(404);
    });

    it('returns 404 when no patterns exist', async () => {
      await supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({
          pattern: 'bad_index',
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(404);
    });

    it('returns empty set when no fields even if meta fields are supplied', async () => {
      await esClient.indices.create({ index: 'fields-route-000001' });

      await supertest
        .get(FIELDS_PATH)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({
          pattern: 'fields-route-000001',
          meta_fields: ['_id', '_index'],
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(200, {
          fields: [],
          indices: ['fields-route-000001'],
        });

      await esClient.indices.delete({ index: 'fields-route-000001' });
    });
  });
}
