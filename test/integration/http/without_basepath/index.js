import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');

  describe('kibana server without basepath', () => {
    it('handles requests not using basepath', async () => {
      const response = await supertest.get('/abc/xyz')
        .expect(302);

      expect(response.headers.location).to.be('/abc/xyz');
    });
  });
}
