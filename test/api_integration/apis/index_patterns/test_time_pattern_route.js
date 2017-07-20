export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const chance = getService('chance');

  describe('index_patterns/_test_time_pattern', () => {
    before(() => esArchiver.load('index_patterns/time_based_indices'));
    after(() => esArchiver.unload('index_patterns/time_based_indices'));

    it('returns all and matching fields for tested pattern', () =>
      supertest
        .get('/api/index_patterns/_test_time_pattern')
        .query({ pattern: '[yearly-]YYYY' })
        .expect(200, {
          all: [
            'yearly-2018',
            'yearly-2017',
            'yearly-2016',
          ],
          matches: [
            'yearly-2018',
            'yearly-2017',
            'yearly-2016',
          ]
        })
    );

    it('returns all and matching fields for tested pattern', () =>
      supertest
        .get('/api/index_patterns/_test_time_pattern')
        .query({ pattern: '[monthly-]YYYY.MM' })
        .expect(200, {
          all: [
            'monthly-2017.01',
            'monthly-invalid',
          ],
          matches: [
            'monthly-2017.01',
          ]
        })
    );

    it('returns an empty response if it does not match any indexes', () =>
      supertest
        .get('/api/index_patterns/_test_time_pattern')
        .query({ pattern: `[${chance.word({ length: 12 })}]-YYYY` })
        .expect(200, {
          all: [],
          matches: []
        })
    );
  });
}
