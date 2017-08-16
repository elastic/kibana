import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('/api/kibana/supported_features', () => {
    it('should return 200 with an object of feature flags', () => (
      supertest.get('/api/kibana/supported_features')
        .expect(200)
        .then((response) => {
          expect(response.body).to.eql({
            field_stats_api: {
              reasons: [],
              supported: true,
            },
          });
        })
    ));
  });
}
