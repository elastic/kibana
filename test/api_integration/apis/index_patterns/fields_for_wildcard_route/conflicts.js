import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('conflicts', () => {
    before(() => esArchiver.load('index_patterns/conflicts'));
    after(() => esArchiver.unload('index_patterns/conflicts'));

    it('flags fields with mismatched types as conflicting', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({ pattern: 'logs-*' })
        .expect(200)
        .then(resp => {
          const dateField = resp.body.fields.find(f => f.type === 'date');
          const successField = resp.body.fields.find(f => f.type === 'conflict');
          expect(dateField).to.eql({
            name: '@timestamp',
            type: 'date',
            aggregatable: true,
            searchable: true,
            readFromDocValues: true,
          });
          expect(successField).to.eql({
            name: 'success',
            type: 'conflict',
            aggregatable: true,
            searchable: true,
            readFromDocValues: false,
            conflictDescriptions: {
              boolean: [
                'logs-2017.01.02'
              ],
              keyword: [
                'logs-2017.01.01'
              ]
            }
          });
        })
    ));

    it('does not mark mismatched types as conflicted if they resolve to the same kibana type', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({ pattern: 'logs-*' })
        .expect(200)
        .then(resp => {
          const resolvedToString = resp.body.fields.find(f => f.type === 'string');
          const resolvedToNumber = resp.body.fields.find(f => f.type === 'number');
          expect(resolvedToString).to.eql({
            name: 'string_conflict',
            type: 'string',
            aggregatable: true,
            searchable: true,
            readFromDocValues: false,
          });
          expect(resolvedToNumber).to.eql({
            name: 'number_conflict',
            type: 'number',
            aggregatable: true,
            searchable: true,
            readFromDocValues: true,
          });
        })
    ));
  });
}
