define(function (require) {
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager, request) {

    bdd.describe('GET index-patterns', function getIndexPatterns() {

      bdd.it('GET should return 200', function return200() {
        return request.get('/index-patterns').expect(200);
      });

    });
  };
});

