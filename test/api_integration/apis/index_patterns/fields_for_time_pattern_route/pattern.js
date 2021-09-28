/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('pattern', () => {
    before(() =>
      esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/daily_index')
    );
    after(() =>
      esArchiver.unload('test/api_integration/fixtures/es_archiver/index_patterns/daily_index')
    );

    it('matches indices with compatible patterns', () =>
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 2,
        })
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            fields: [
              {
                name: '@timestamp',
                type: 'date',
                esTypes: ['date'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'Jan01',
                type: 'boolean',
                esTypes: ['boolean'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'Jan02',
                type: 'boolean',
                esTypes: ['boolean'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
            ],
          });
        }));

    it('respects look_back parameter', () =>
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 1,
        })
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            fields: [
              {
                name: '@timestamp',
                type: 'date',
                esTypes: ['date'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'Jan02',
                type: 'boolean',
                esTypes: ['boolean'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
            ],
          });
        }));

    it('includes a field for each of `meta_fields` names', () =>
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 1,
          meta_fields: JSON.stringify(['meta1', 'meta2']),
        })
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            fields: [
              {
                name: '@timestamp',
                type: 'date',
                esTypes: ['date'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'Jan02',
                type: 'boolean',
                esTypes: ['boolean'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'meta1',
                type: 'string',
                aggregatable: false,
                searchable: false,
                readFromDocValues: false,
                metadata_field: true,
              },
              {
                name: 'meta2',
                type: 'string',
                aggregatable: false,
                searchable: false,
                readFromDocValues: false,
                metadata_field: true,
              },
            ],
          });
        }));
  });
}
