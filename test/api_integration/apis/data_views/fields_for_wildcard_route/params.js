/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ getService }) {
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
      supertest.get('/api/index_patterns/_fields_for_wildcard').query({}).expect(400));

    it('accepts a JSON formatted meta_fields query param', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: JSON.stringify(['meta']),
        })
        .expect(200));

    it('accepts include_unmapped param', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          include_unmapped: true,
        })
        .expect(200));

    it('accepts meta_fields query param in string array', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: ['_id', 'meta'],
        })
        .expect(200));

    it('accepts single meta_fields query param', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: ['_id'],
        })
        .expect(200));

    it('rejects a comma-separated list of meta_fields', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: 'foo,bar',
        })
        .expect(400));

    it('rejects unexpected query params', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: randomness.word(),
          [randomness.word()]: randomness.word(),
        })
        .expect(400));
  });
}
