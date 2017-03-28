import expect from 'expect.js';

import { client, emptyKibana, supertest } from './lib';

describe('Search Count API', function postIngest() {
  before(() => emptyKibana.setup());
  after(() => emptyKibana.teardown());

  before(function () {
    return client.index({
      index: 'foo-1',
      type: 'bar',
      id: '1',
      body: {
        foo: 'bar'
      }
    })
    .then(function () {
      return client.index({
        index: 'foo-2',
        type: 'bar',
        id: '2',
        body: {
          foo: 'bar'
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

  it('should return 200 with a document count for existing indices', function () {
    return supertest.post('/kibana/foo-*/_count')
    .expect(200)
    .then(function (response) {
      expect(response.body.count).to.be(2);
    });
  });

  it('should support GET requests as well', function () {
    return supertest.get('/kibana/foo-*/_count')
      .expect(200)
      .then(function (response) {
        expect(response.body.count).to.be(2);
      });
  });

  it('should return 404 if a pattern matches no indices', function () {
    return supertest.post('/kibana/doesnotexist-*/_count')
    .expect(404);
  });

  it('should return 404 if a concrete index does not exist', function () {
    return supertest.post('/kibana/concrete/_count')
      .expect(404);
  });
});
