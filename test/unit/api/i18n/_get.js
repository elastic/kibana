define(function (require) {
  var Promise = require('bluebird');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager, request) {
    bdd.describe('GET translations', function postIngest() {

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana');
      });

      bdd.it('should return 200 for an valid payload', function validPayload() {
        return Promise.all([
          request.get('/i18n/translations').expect(200),
        ]);
      });
      //TODO (hickeyma): Extend test cases once I have refactored the module and hapi APIs after feedback on removeing plugin namd and language from API

    });
  };
});
