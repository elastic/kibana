define(function (require) {
  const expect = require('intern/dojo/node!expect.js');
  const { client, emptyKibana } = require('intern/dojo/node!../lib/es');

  return function (bdd, request) {
    bdd.describe('Count API', function postIngest() {

      bdd.before(function () {
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

      bdd.after(function () {
        return emptyKibana.setup().then(function () {
          return client.indices.delete({
            index: 'foo*'
          });
        });
      });

      bdd.it('should return 200 with a document count for existing indices', function () {
        return request.post('/kibana/foo-*/_count')
        .expect(200)
        .then(function (response) {
          expect(response.body.count).to.be(2);
        });
      });

      bdd.it('should support GET requests as well', function () {
        return request.get('/kibana/foo-*/_count')
          .expect(200)
          .then(function (response) {
            expect(response.body.count).to.be(2);
          });
      });

      bdd.it('should return 404 if a pattern matches no indices', function () {
        return request.post('/kibana/doesnotexist-*/_count')
        .expect(404);
      });

      bdd.it('should return 404 if a concrete index does not exist', function () {
        return request.post('/kibana/concrete/_count')
          .expect(404);
      });

    });
  };
});
