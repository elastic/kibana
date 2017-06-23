import expect from 'expect.js';
import { get } from 'lodash';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Create API', () => {

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
      it('should be able to create objects', () => {
        return supertest
          .post('/api/saved_objects/index-pattern')
          .send({ attributes: { title: 'Test pattern' } })
          .expect(200)
          .then((response) => {
            expect(get(response, 'body.attributes.title')).to.be('Test pattern');
          });
      });
    }
  });
}
