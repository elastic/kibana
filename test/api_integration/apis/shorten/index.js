import expect from 'expect.js';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('url shortener', () => {
    before(() => esArchiver.load('saved_objects/basic'));
    after(() => esArchiver.unload('saved_objects/basic'));

    it('generates shortened urls', async () => {
      const resp = await supertest
        .post('/shorten')
        .set('content-type', 'application/json')
        .send({ url: '/app/kibana#/visualize/create' })
        .expect(200);

      expect(typeof resp.text).to.be('string');
      expect(resp.text.length > 0).to.be(true);
    });

    it('redirects shortened urls', async () => {
      const resp = await supertest
        .post('/shorten')
        .set('content-type', 'application/json')
        .send({ url: '/app/kibana#/visualize/create' });

      await supertest
        .get(`/goto/${resp.text}`)
        .expect(302)
        .expect('location', '/app/kibana#/visualize/create');
    });
  });
}
