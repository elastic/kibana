define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager, request) {
    bdd.describe('processors', () => {

      bdd.it('should return 200 for a successful run', function () {
        return request.get('/kibana/ingest/processors')
        .expect(200)
        .then((response) => {
          expect(_.isArray(response.body)).to.be(true);
        });
      });

    });
  };
});
