define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager, request) {
    bdd.describe('field_capabilities API', function postIngest() {

      bdd.before(function () {
        return scenarioManager.client.create({
          index: 'foo-1',
          type: 'bar',
          id: '1',
          body: {
            foo: 'bar'
          }
        })
        .then(function () {
          return scenarioManager.client.create({
            index: 'foo-2',
            type: 'bar',
            id: '2',
            body: {
              baz: 'bar'
            }
          });
        })
        .then(function () {
          return scenarioManager.client.indices.refresh({
            index: ['foo-1', 'foo-2']
          });
        });
      });

      bdd.after(function () {
        return scenarioManager.reload('emptyKibana')
        .then(function () {
          scenarioManager.client.indices.delete({
            index: 'foo*'
          });
        });
      });

      bdd.it('should return searchable/aggregatable flags for fields in the indices specified', function () {
        return request.get('/kibana/foo-1/field_capabilities')
        .expect(200)
        .then(function (response) {
          var fields = response.body.fields;
          expect(fields.foo).to.eql({searchable: true, aggregatable: false});
          expect(fields['foo.keyword']).to.eql({searchable: true, aggregatable: true});
          expect(fields).to.not.have.property('baz');
        });
      });

      bdd.it('should accept wildcards in the index name', function () {
        return request.get('/kibana/foo-*/field_capabilities')
        .expect(200)
        .then(function (response) {
          var fields = response.body.fields;
          expect(fields.foo).to.eql({searchable: true, aggregatable: false});
          expect(fields.baz).to.eql({searchable: true, aggregatable: false});
        });
      });

      bdd.it('should accept comma delimited lists of indices', function () {
        return request.get('/kibana/foo-1,foo-2/field_capabilities')
        .expect(200)
        .then(function (response) {
          var fields = response.body.fields;
          expect(fields.foo).to.eql({searchable: true, aggregatable: false});
          expect(fields.baz).to.eql({searchable: true, aggregatable: false});
        });
      });

      bdd.it('should return 404 if a pattern matches no indices', function () {
        return request.post('/kibana/doesnotexist-*/field_capabilities')
        .expect(404);
      });

      bdd.it('should return 404 if a concrete index does not exist', function () {
        return request.post('/kibana/concrete/field_capabilities')
        .expect(404);
      });

    });
  };
});
