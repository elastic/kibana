import _ from 'intern/dojo/node!lodash';
import expect from 'intern/dojo/node!expect.js';

export default function (bdd, scenarioManager, request) {
  bdd.describe('processors', () => {

    bdd.it('should return 200 for a successful run', function () {
      return request.get('/kibana/ingest/processors')
      .expect(200)
      .then((response) => {
        expect(_.isArray(response.body)).to.be(true);
      });
    });

  });
}
