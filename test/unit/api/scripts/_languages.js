define(function (require) {
  let expect = require('intern/dojo/node!expect.js');

  return function (bdd, request) {
    bdd.describe('Languages API', function getLanguages() {

      bdd.it('should return 200 with an array of languages', function () {
        return request.get('/kibana/scripts/languages')
        .expect(200)
        .then(function (response) {
          expect(response.body).to.be.an('array');
        });
      });

      bdd.it('should only return langs enabled for inline scripting', function () {
        return request.get('/kibana/scripts/languages')
        .expect(200)
        .then(function (response) {
          expect(response.body).to.contain('expression');
          expect(response.body).to.contain('painless');

          expect(response.body).to.not.contain('groovy');
        });
      });
    });
  };
});
