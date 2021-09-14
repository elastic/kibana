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

  describe('query params', () => {
    before(() =>
      esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/daily_index')
    );
    after(() =>
      esArchiver.unload('test/api_integration/fixtures/es_archiver/index_patterns/daily_index')
    );

    it('requires `pattern` query param', () =>
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({ look_back: 1 })
        .expect(400)
        .then((resp) => {
          expect(resp.body.message).to.contain(
            '[request query.pattern]: expected value of type [string] but got [undefined]'
          );
        }));

    it('requires `look_back` query param', () =>
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({ pattern: 'pattern-*' })
        .expect(400)
        .then((resp) => {
          expect(resp.body.message).to.contain(
            '[request query.look_back]: expected value of type [number] but got [undefined]'
          );
        }));

    it('supports `meta_fields` query param in JSON format', () =>
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 1,
          meta_fields: JSON.stringify(['a']),
        })
        .expect(200));

    it('supports `meta_fields` query param in string array format', () =>
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 1,
          meta_fields: ['a', 'b'],
        })
        .expect(200));

    it('requires `look_back` to be a number', () =>
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 'foo',
        })
        .expect(400)
        .then((resp) => {
          expect(resp.body.message).to.contain(
            '[request query.look_back]: expected value of type [number] but got [string]'
          );
        }));

    it('requires `look_back` to be greater than one', () =>
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 0,
        })
        .expect(400)
        .then((resp) => {
          expect(resp.body.message).to.contain(
            '[request query.look_back]: Value must be equal to or greater than [1].'
          );
        }));
  });
}
