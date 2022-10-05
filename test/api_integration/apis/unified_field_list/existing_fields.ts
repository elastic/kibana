/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_START_TIME = '2010-09-19T06:31:44.000';
const TEST_END_TIME = '2023-09-23T18:31:44.000';
const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};
const metaFields = ['_id', '_index', '_score', '_source'];

const fieldsWithData = [
  'ts',
  'filter_field',
  'textfield1',
  'textfield2',
  'mapping_runtime_field',
  'data_view_runtime_field',
];

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const dataViewId = 'existence_index';
  const API_PATH = `/api/unified_field_list/existing_fields/${dataViewId}`;

  describe('existing_fields apis', () => {
    before(async () => {
      await esArchiver.load(
        'test/api_integration/fixtures/es_archiver/index_patterns/constant_keyword'
      );
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/index_patterns/constant_keyword.json'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/index_patterns/constant_keyword'
      );
      await kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/index_patterns/constant_keyword.json'
      );
    });

    describe('existence', () => {
      it('should find which fields exist in the sample documents', async () => {
        const { body } = await supertest
          .post(API_PATH)
          .set(COMMON_HEADERS)
          .send({
            dslQuery: {
              bool: {
                filter: [{ match_all: {} }],
              },
            },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
          })
          .expect(200);

        expect(body.indexPatternTitle).to.eql('existence_index_*');
        expect(body.existingFieldNames.sort()).to.eql([...metaFields, ...fieldsWithData].sort());
      });

      it('should return fields filtered by term query', async () => {
        const expectedFieldNames = [
          'ts',
          'filter_field',
          'textfield1',
          // textfield2 and mapping_runtime_field are defined on the other index
          'data_view_runtime_field',
        ];

        const { body } = await supertest
          .post(API_PATH)
          .set(COMMON_HEADERS)
          .send({
            dslQuery: {
              bool: {
                filter: [{ term: { filter_field: 'a' } }],
              },
            },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
          })
          .expect(200);
        expect(body.existingFieldNames.sort()).to.eql(
          [...metaFields, ...expectedFieldNames].sort()
        );
      });

      it('should return fields filtered by match_phrase query', async () => {
        const expectedFieldNames = [
          'ts',
          'filter_field',
          'textfield1',
          // textfield2 and mapping_runtime_field are defined on the other index
          'data_view_runtime_field',
        ];

        const { body } = await supertest
          .post(API_PATH)
          .set(COMMON_HEADERS)
          .send({
            dslQuery: {
              bool: {
                filter: [{ match_phrase: { filter_field: 'a' } }],
              },
            },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
          })
          .expect(200);
        expect(body.existingFieldNames.sort()).to.eql(
          [...metaFields, ...expectedFieldNames].sort()
        );
      });

      it('should return fields filtered by time range', async () => {
        const expectedFieldNames = [
          'ts',
          'filter_field',
          'textfield1',
          // textfield2 and mapping_runtime_field are defined on the other index
          'data_view_runtime_field',
        ];

        const { body } = await supertest
          .post(API_PATH)
          .set(COMMON_HEADERS)
          .send({
            dslQuery: {
              bool: {
                filter: [{ term: { filter_field: 'a' } }],
              },
            },
            fromDate: TEST_START_TIME,
            toDate: '2021-12-12',
          })
          .expect(200);
        expect(body.existingFieldNames.sort()).to.eql(
          [...metaFields, ...expectedFieldNames].sort()
        );
      });
    });
  });
};
