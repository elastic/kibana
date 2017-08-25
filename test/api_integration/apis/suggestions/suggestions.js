export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('Suggestions API', function () {
    it('should return 200 with a regex', () => (
      supertest
        .post('/api/kibana/suggestions/values/*')
        .query({
          field: 'bar.keyword',
          query: '<something?with:lots&of^ bad characters'
        })
        .expect(200)
    ));
  });
}
