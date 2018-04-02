export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('Kibana server with basePath', () => {
    const basePath = '/abc/xyz';

    it('redirects root requests to basePath root', async () => {
      await supertest.get('http://localhost:5640')
        .expect(302)
        .expect('location', `${basePath}/app/kibana`);
    });
  });
}
