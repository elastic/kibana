import expect from 'expect.js';
import { sortBy } from 'lodash';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const chance = getService('chance');

  const ensureFieldsAreSorted = resp => {
    expect(resp.body.fields)
      .to.eql(sortBy(resp.body.fields, 'name'));
  };

  describe('index_patterns/_fields_for_wildcard', () => {
    before(() => esArchiver.load('index_patterns/basic_index'));
    after(() => esArchiver.unload('index_patterns/basic_index'));

    it('requires a pattern query param', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({})
        .expect(400)
    ));

    it('accepts a JSON formatted meta_fields query param', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: JSON.stringify(['meta'])
        })
        .expect(200)
    ));

    it('rejects a comma-separated list of meta_fields', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: 'foo,bar'
        })
        .expect(400)
    ));

    it('rejects unexpected query params', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: chance.word(),
          [chance.word()]: chance.word(),
        })
        .expect(400)
    ));

    it('returns a flattened version of the fields in es', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({ pattern: 'basic_index' })
        .expect(200, {
          fields: [
            {
              type: 'boolean',
              searchable: true,
              aggregatable: true,
              name: 'bar',
              readFromDocValues: true
            },
            {
              type: 'string',
              searchable: true,
              aggregatable: false,
              name: 'baz',
              readFromDocValues: false
            },
            {
              type: 'string',
              searchable: true,
              aggregatable: true,
              name: 'baz.keyword',
              readFromDocValues: true
            },
            {
              type: 'number',
              searchable: true,
              aggregatable: true,
              name: 'foo',
              readFromDocValues: true
            }
          ]
        })
        .then(ensureFieldsAreSorted)
    );

    it('always returns a field for all passed meta fields', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: 'basic_index',
          meta_fields: JSON.stringify([
            '_id',
            '_source',
            'crazy_meta_field'
          ])
        })
        .expect(200, {
          fields: [
            {
              aggregatable: false,
              name: '_id',
              readFromDocValues: false,
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: false,
              name: '_source',
              readFromDocValues: false,
              searchable: false,
              type: '_source',
            },
            {
              type: 'boolean',
              searchable: true,
              aggregatable: true,
              name: 'bar',
              readFromDocValues: true
            },
            {
              aggregatable: false,
              name: 'baz',
              readFromDocValues: false,
              searchable: true,
              type: 'string',
            },
            {
              type: 'string',
              searchable: true,
              aggregatable: true,
              name: 'baz.keyword',
              readFromDocValues: true
            },
            {
              aggregatable: false,
              name: 'crazy_meta_field',
              readFromDocValues: false,
              searchable: false,
              type: 'string',
            },
            {
              type: 'number',
              searchable: true,
              aggregatable: true,
              name: 'foo',
              readFromDocValues: true
            }
          ]
        })
        .then(ensureFieldsAreSorted)
    );
  });
}
