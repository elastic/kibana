import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('pattern', () => {
    before(() => esArchiver.load('index_patterns/daily_index'));
    after(() => esArchiver.unload('index_patterns/daily_index'));

    it('matches indices with compatible patterns', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 2,
        })
        .expect(200)
        .then(resp => {
          expect(resp.body).to.eql({
            fields: [
              {
                name: '@timestamp',
                type: 'date',
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
              },
              {
                name: 'Jan01',
                type: 'boolean',
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
              },
              {
                name: 'Jan02',
                type: 'boolean',
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
              }
            ]
          });
        })
    ));

    it('respects look_back parameter', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 1,
        })
        .expect(200)
        .then(resp => {
          expect(resp.body).to.eql({
            fields: [
              {
                name: '@timestamp',
                type: 'date',
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
              },
              {
                name: 'Jan02',
                type: 'boolean',
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
              }
            ]
          });
        })
    ));

    it('includes a field for each of `meta_fields` names', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 1,
          meta_fields: JSON.stringify(['meta1', 'meta2'])
        })
        .expect(200)
        .then(resp => {
          expect(resp.body).to.eql({
            fields: [
              {
                name: '@timestamp',
                type: 'date',
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
              },
              {
                name: 'Jan02',
                type: 'boolean',
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
              },
              {
                name: 'meta1',
                type: 'string',
                aggregatable: false,
                searchable: false,
                readFromDocValues: false,
              },
              {
                name: 'meta2',
                type: 'string',
                aggregatable: false,
                searchable: false,
                readFromDocValues: false,
              },
            ]
          });
        })
    ));
  });
}
