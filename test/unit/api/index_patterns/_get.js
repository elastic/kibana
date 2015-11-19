define(function (require) {
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');
  var createTestData = require('intern/dojo/node!../../../unit/api/index_patterns/data');
  var Promise = require('bluebird');

  return function (bdd, scenarioManager, request) {

    bdd.describe('GET index-patterns', function getIndexPatterns() {

      bdd.before(function () {
        return scenarioManager.reload('emptyKibana').then(function () {
          return Promise.all([
            request.post('/index-patterns').send(createTestData().indexPatternWithMappings),
            request.post('/index-patterns').send(_.assign(createTestData().indexPatternWithMappings, {title: 'foo'})),
            request.post('/index-patterns').send(_.assign(createTestData().indexPatternWithMappings, {title: 'bar*'})),
            request.post('/index-patterns').send(_.assign(createTestData().indexPatternWithMappings,
              {title: '[.marvel-es-]YYYY.MM.DD'}))
          ]).then(function () {
            return scenarioManager.client.indices.refresh({
              index: '.kibana'
            });
          });
        });
      });

      bdd.after(function () {
        return Promise.all([
          request.del('/index-patterns/logstash-*'),
          request.del('/index-patterns/foo'),
          request.del('/index-patterns/bar*'),
          request.del('/index-patterns/[.marvel-es-]YYYY.MM.DD')
        ]);
      });

      bdd.it('should return 200 with all patterns in an array', function return200() {
        return request.get('/index-patterns')
          .expect(200)
          .then(function (res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be(4);
          });
      });

      bdd.describe('GET index-pattern by ID', function getIndexPatternByID() {

      });
    });


  };
});

