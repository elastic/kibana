export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('kibana server with ssl', () => {
    it('handles requests using ssl', async () => {
      await supertest.get('https://localhost:5640')
        .expect(200);
    });

    it('rejects requests not using ssl', async () => {
      await supertest.get('http://localhost:5640')
        .expect(400);
    });
  });
}
