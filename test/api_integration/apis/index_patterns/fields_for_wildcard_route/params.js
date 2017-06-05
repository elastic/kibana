export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const chance = getService('chance');

  describe('params', () => {
    before(() => esArchiver.load('index_patterns/basic_index'));
    after(() => esArchiver.unload('index_patterns/basic_index'));

    it('requires a pattern query param', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({})
        .expect(400)
    ));

    it('accepts a JSON formatted meta_fields query param', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: JSON.stringify(['meta'])
        })
        .expect(200)
    ));

    it('rejects a comma-separated list of meta_fields', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: 'foo,bar'
        })
        .expect(400)
    ));

    it('rejects unexpected query params', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: chance.word(),
          [chance.word()]: chance.word(),
        })
        .expect(400)
    ));
  });
}
