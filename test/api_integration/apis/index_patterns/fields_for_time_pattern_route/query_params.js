import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('query params', () => {
    before(() => esArchiver.load('index_patterns/daily_index'));
    after(() => esArchiver.unload('index_patterns/daily_index'));

    it('requires `pattern` and `look_back` query params', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({ pattern: null })
        .expect(400)
        .then(resp => {
          expect(resp.body.validation).to.eql({
            keys: [
              'pattern',
              'look_back'
            ],
            source: 'query'
          });
        })
    ));

    it('supports `meta_fields` query param', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 1,
          meta_fields: JSON.stringify(['a'])
        })
        .expect(200)
    ));

    it('requires `look_back` to be a number', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 'foo',
        })
        .expect(400)
        .then(resp => {
          expect(resp.body.message).to.contain('"look_back" must be a number');
        })
    ));

    it('requires `look_back` to be greater than one', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 0,
        })
        .expect(400)
        .then(resp => {
          expect(resp.body.message).to.contain('"look_back" must be larger than or equal to 1');
        })
    ));
  });
}
