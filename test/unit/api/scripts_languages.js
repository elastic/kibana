import expect from 'expect.js';

import { supertest, emptyKibana } from './lib';

describe('Script Languages API', function getLanguages() {
  before(() => emptyKibana.setup());
  after(() => emptyKibana.teardown());

  it('should return 200 with an array of languages', () => {
    return supertest.get('/kibana/scripts/languages')
    .expect(200)
    .then((response) => {
      expect(response.body).to.be.an('array');
    });
  });

  it('should only return langs enabled for inline scripting', () => {
    return supertest.get('/kibana/scripts/languages')
    .expect(200)
    .then((response) => {
      expect(response.body).to.contain('expression');
      expect(response.body).to.contain('painless');

      expect(response.body).to.not.contain('groovy');
    });
  });
});
