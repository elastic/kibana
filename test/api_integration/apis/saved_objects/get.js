import expect from 'expect.js';
import { get } from 'lodash';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Get API', () => {

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
      it('should return a saved object by id', () => {
        return supertest
          .get('/api/saved_objects/index-pattern/.kibana')
          .expect(200)
          .then((response) => {
            expect(get(response, 'body.attributes.title')).to.be('.kibana');
          });
      });

      it('should 404 if no saved objects are found', () => {
        return supertest
          .get('/api/saved_objects/index-pattern/does_not_exist')
          .expect(404);
      });
    }

  });
}
