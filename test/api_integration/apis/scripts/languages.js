import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('Script Languages API', function getLanguages() {
    it('should return 200 with an array of languages', () => (
      supertest.get('/api/kibana/scripts/languages')
        .expect(200)
        .then((response) => {
          expect(response.body).to.be.an('array');
        })
    ));

    it.skip('should only return langs enabled for inline scripting', () => (
      supertest.get('/api/kibana/scripts/languages')
        .expect(200)
        .then((response) => {
          expect(response.body).to.contain('expression');
          expect(response.body).to.contain('painless');
          expect(response.body).to.contain('groovy');
        })
    ));
  });
}
