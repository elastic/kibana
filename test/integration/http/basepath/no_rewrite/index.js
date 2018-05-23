export default function ({ getService }) {

  const supertest = getService('supertest');

  describe('Kibana server with basePath and with rewriteBasePath', () => {
    const basePath = '/abc/xyz';

    it('requires root requests to contain basePath', async () => {
      await supertest.get(`/abc/xyz`)
        .expect(302)
        .expect('location', `${basePath}/app/kibana`);
    });

    it('cannot find root requests', async () => {
      await supertest.get(`/`)
        .expect(404);
    });
  });
}
