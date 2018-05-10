export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');

  describe('kibana server without basepath', () => {
    it('handles requests not using basepath', async () => {
      await supertest.get('/abc/xyz')
        .expect(302)
        .expect('location', '/abc/xyz');
    });
  });
}
