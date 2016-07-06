define(function (require) {
  var expect = require('intern/dojo/node!expect.js');
  var testData = require('intern/dojo/node!../../../unit/api/i18n/data');

  return function (bdd, scenarioManager, request) {
    bdd.describe('GET translations', function postIngest() {

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana');
      });

      bdd.before(function () {
        return testData.createTestTranslations();
      });

      bdd.it('should return 200 and a valid response payload', function validPayload() {
        return request.get('/i18n/translations')
          .expect(200)
          .then(function (res) {
            var translationsReturned = JSON.parse(res.text);
            expect(testData.checkReturnedTranslations(translationsReturned)).to.be(true);
          });
      });

      bdd.after(function () {
        return testData.deleteTestTranslations();
      });
    });
  };
});
