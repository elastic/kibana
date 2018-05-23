export default function ({ getService }) {
  const supertest = getService('supertest');

  /* Node rejects unauthorized TLS requests by default.
   * When testing https server, set this to false.
   * https://github.com/visionmedia/supertest/issues/396
   */
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  describe('kibana server with ssl', () => {
    it('handles requests using ssl', async () => {
      await supertest.get('/')
        .expect(302);
    });
  });
}
