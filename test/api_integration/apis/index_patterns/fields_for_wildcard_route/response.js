import expect from 'expect.js';
import { sortBy } from 'lodash';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  const ensureFieldsAreSorted = resp => {
    expect(resp.body.fields)
      .to.eql(sortBy(resp.body.fields, 'name'));
  };

  describe('response', () => {
    before(() => esArchiver.load('index_patterns/basic_index'));
    after(() => esArchiver.unload('index_patterns/basic_index'));

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
