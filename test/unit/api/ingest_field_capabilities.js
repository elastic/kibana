import expect from 'expect.js';

import { emptyKibana, client, supertest } from './lib';

describe('ingest field_capabilities API', () => {
  before(() => emptyKibana.setup());
  after(() => emptyKibana.teardown());

  before(() => {
    return client.create({
      index: 'foo-1',
      type: 'bar',
      id: '1',
      body: {
        foo: 'bar'
      }
    })
    .then(() => {
      return client.create({
        index: 'foo-2',
        type: 'bar',
        id: '2',
        body: {
          baz: 'bar'
        }
      });
    })
    .then(() => {
      return client.indices.refresh({
        index: ['foo-1', 'foo-2']
      });
    });
  });

  after(() => {
    return emptyKibana.setup().then(() => {
      return client.indices.delete({
        index: 'foo*'
      });
    });
  });

  it('should return searchable/aggregatable flags for fields in the indices specified', () => {
    return supertest.get('/kibana/foo-1/field_capabilities')
    .expect(200)
    .then((response) => {
      const fields = response.body.fields;
      expect(fields.foo).to.eql({ searchable: true, aggregatable: false });
      expect(fields['foo.keyword']).to.eql({ searchable: true, aggregatable: true });
      expect(fields).to.not.have.property('baz');
    });
  });

  it('should accept wildcards in the index name', () => {
    return supertest.get('/kibana/foo-*/field_capabilities')
    .expect(200)
    .then((response) => {
      const fields = response.body.fields;
      expect(fields.foo).to.eql({ searchable: true, aggregatable: false });
      expect(fields.baz).to.eql({ searchable: true, aggregatable: false });
    });
  });

  it('should accept comma delimited lists of indices', () => {
    return supertest.get('/kibana/foo-1,foo-2/field_capabilities')
    .expect(200)
    .then((response) => {
      const fields = response.body.fields;
      expect(fields.foo).to.eql({ searchable: true, aggregatable: false });
      expect(fields.baz).to.eql({ searchable: true, aggregatable: false });
    });
  });

  it('should return 404 if a pattern matches no indices', () => {
    return supertest.post('/kibana/doesnotexist-*/field_capabilities')
    .expect(404);
  });

  it('should return 404 if a concrete index does not exist', () => {
    return supertest.post('/kibana/concrete/field_capabilities')
    .expect(404);
  });

});
