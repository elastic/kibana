import expect from 'expect.js';

import { emptyKibana, client, supertest } from './lib';

describe('ingest field_capabilities API', () => {
  before(() => emptyKibana.setup());
  after(() => emptyKibana.teardown());

  before(function () {
    return client.create({
      index: 'foo-1',
      type: 'bar',
      id: '1',
      body: {
        foo: 'bar'
      }
    })
    .then(function () {
      return client.create({
        index: 'foo-2',
        type: 'bar',
        id: '2',
        body: {
          baz: 'bar'
        }
      });
    })
    .then(function () {
      return client.indices.refresh({
        index: ['foo-1', 'foo-2']
      });
    });
  });

  after(function () {
    return emptyKibana.setup().then(function () {
      return client.indices.delete({
        index: 'foo*'
      });
    });
  });

  it('should return searchable/aggregatable flags for fields in the indices specified', function () {
    return supertest.get('/kibana/foo-1/field_capabilities')
    .expect(200)
    .then(function (response) {
      const fields = response.body.fields;
      expect(fields.foo).to.eql({ searchable: true, aggregatable: false });
      expect(fields['foo.keyword']).to.eql({ searchable: true, aggregatable: true });
      expect(fields).to.not.have.property('baz');
    });
  });

  it('should accept wildcards in the index name', function () {
    return supertest.get('/kibana/foo-*/field_capabilities')
    .expect(200)
    .then(function (response) {
      const fields = response.body.fields;
      expect(fields.foo).to.eql({ searchable: true, aggregatable: false });
      expect(fields.baz).to.eql({ searchable: true, aggregatable: false });
    });
  });

  it('should accept comma delimited lists of indices', function () {
    return supertest.get('/kibana/foo-1,foo-2/field_capabilities')
    .expect(200)
    .then(function (response) {
      const fields = response.body.fields;
      expect(fields.foo).to.eql({ searchable: true, aggregatable: false });
      expect(fields.baz).to.eql({ searchable: true, aggregatable: false });
    });
  });

  it('should return 404 if a pattern matches no indices', function () {
    return supertest.post('/kibana/doesnotexist-*/field_capabilities')
    .expect(404);
  });

  it('should return 404 if a concrete index does not exist', function () {
    return supertest.post('/kibana/concrete/field_capabilities')
    .expect(404);
  });

});
