import expect from 'expect.js';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Count API', function postIngest() {
    before(() => esArchiver.load('search/count'));
    after(() => esArchiver.unload('search/count'));

    it('should return 200 with a document count for existing indices', () => (
      supertest
        .post('/api/kibana/foo-*/_count')
        .expect(200)
        .then((response) => {
          expect(response.body.count).to.be(2);
        })
    ));

    it('should support GET requests as well', () => (
      supertest
        .get('/api/kibana/foo-*/_count')
        .expect(200)
        .then((response) => {
          expect(response.body.count).to.be(2);
        })
    ));

    it('should return 404 if a pattern matches no indices', () => (
      supertest
        .post('/api/kibana/doesnotexist-*/_count')
        .expect(404)
    ));

    it('should return 404 if a concrete index does not exist', () => (
      supertest
        .post('/api/kibana/concrete/_count')
        .expect(404)
    ));

  });
}
