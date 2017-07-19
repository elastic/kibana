export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('errors', () => {
    it('returns 404 when no indices match', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[not-really-an-index-]YYYY.MM.DD',
          look_back: 1
        })
        .expect(404)
    ));
  });
}
