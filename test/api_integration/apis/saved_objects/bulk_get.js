import expect from 'expect.js';
import { get } from 'lodash';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Bulk get API', () => {

    describe(('multiple _types'), () => {
      before(() => esArchiver.load('saved_objects/multiple_types'));
      after(() => esArchiver.unload('saved_objects/multiple_types'));
      runTests();
    });

    describe(('single _type'), () => {
      before(() => esArchiver.load('saved_objects/single_type'));
      after(() => esArchiver.unload('saved_objects/single_type'));
      runTests();
    });

    function runTests() {

      it('should be able to get objects', () => {
        return supertest
          .post('/api/saved_objects/bulk_get')
          .send([
            {
              id: '6.0.0-alpha3',
              type: 'config'
            }
          ])
          .expect(200)
          .then((response) => {
            expect(get(response, 'body.saved_objects.0.attributes')).to.eql({
              buildNum: 8467,
              defaultIndex: '.kibana',
              'doc_table:highlight': false
            });
          });
      });

      it('should not return objects that don\'t exist', () => {
        return supertest
          .post('/api/saved_objects/bulk_get')
          .send([
            {
              id: 'foo',
              type: 'config'
            }
          ])
          .expect(200)
          .then((response) => {
            expect(get(response, 'body.saved_objects').length).to.be(0)
          });
      });

      it('should should error type is missing', () => {
        return supertest
          .post('/api/saved_objects/bulk_get')
          .send([
            {
              type: 'config'
            }
          ])
          .expect(400)
      });

      it('should should error id is missing', () => {
        return supertest
          .post('/api/saved_objects/bulk_get')
          .send([
            {
              id: 'foo'
            }
          ])
          .expect(400)
      });

    }
  });
}
