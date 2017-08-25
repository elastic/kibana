export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Suggestions API', function () {
    before(() => esArchiver.load('index_patterns/basic_index'));
    after(() => esArchiver.unload('index_patterns/basic_index'));

    it('should return 200 with special characters', () => (
      supertest
        .post('/api/kibana/suggestions/values/basic_index')
        .send({
          field: 'baz.keyword',
          query: '<something?with:lots&of^ bad characters'
        })
        .expect(200)
    ));
  });
}
