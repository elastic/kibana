export default function ({ getService }) {

  const supertest = getService('supertest');

  describe('Kibana server with basePath and without rewriteBasePath', () => {
    const basePath = '/abc/xyz';

    it('cannot find requests containing basePath', async () => {
      await supertest.get(`/abc/xyz`)
        .expect(404);
    });

    it('redirects root requests to basePath root', async () => {
      await supertest.get(`/`)
        .expect(302)
        .expect('location', `${basePath}/app/kibana`);
    });
  });
}
