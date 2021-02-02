/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('conflicts', () => {
    before(() => esArchiver.load('index_patterns/conflicts'));
    after(() => esArchiver.unload('index_patterns/conflicts'));

    it('flags fields with mismatched types as conflicting', () =>
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
              },
              {
                name: 'number_conflict',
                type: 'number',
                esTypes: ['integer', 'float'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
              },
              {
                name: 'string_conflict',
                type: 'string',
                esTypes: ['text', 'keyword'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: false,
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
              },
            ],
          });
        }));
  });
}
