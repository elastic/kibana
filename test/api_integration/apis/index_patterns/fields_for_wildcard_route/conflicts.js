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
  const esVersion = getService('esVersion');

  describe('conflicts', () => {
    before(() =>
      esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/conflicts')
    );
    after(() =>
      esArchiver.unload('test/api_integration/fixtures/es_archiver/index_patterns/conflicts')
    );

    const itIfLessThanEs811 = esVersion.matchRange('<8.11') ? it : it.skip;
    const itIfGreaterOrEqualEs811 = esVersion.matchRange('>=8.11') ? it : it.skip;

    itIfLessThanEs811('flags fields with mismatched types as conflicting (<8.11)', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({ pattern: 'logs-*' })
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
                name: 'number_conflict',
                type: 'number',
                esTypes: ['integer', 'float'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'string_conflict',
                type: 'string',
                esTypes: ['text', 'keyword'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: false,
                metadata_field: false,
              },
              {
                name: 'success',
                type: 'conflict',
                esTypes: ['boolean', 'keyword'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: false,
                conflictDescriptions: {
                  boolean: ['logs-2017.01.02'],
                  keyword: ['logs-2017.01.01'],
                },
                metadata_field: false,
              },
            ],
          });
        })
    );

    itIfGreaterOrEqualEs811('flags fields with mismatched types as conflicting (>=8.11)', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({ pattern: 'logs-*' })
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
                name: 'number_conflict',
                type: 'number',
                esTypes: ['float', 'integer'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'string_conflict',
                type: 'string',
                esTypes: ['keyword', 'text'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'success',
                type: 'conflict',
                esTypes: ['keyword', 'boolean'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: false,
                conflictDescriptions: {
                  boolean: ['logs-2017.01.02'],
                  keyword: ['logs-2017.01.01'],
                },
                metadata_field: false,
              },
            ],
          });
        })
    );
  });
}
