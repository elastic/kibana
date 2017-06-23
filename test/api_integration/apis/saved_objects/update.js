import expect from 'expect.js';
import { get } from 'lodash';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Update API', () => {

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
      it('should be able to update objects', () => {
        return supertest
          .post('/api/saved_objects/index-pattern')
          .send({ attributes: { title: 'Test title' } })
          .expect(200)
          .then((response) => {
            const id = get(response, 'body.id');
            return supertest
              .post('/api/saved_objects/index-pattern')
              .send({ attributes: { title: 'Updated title' } })
              .expect(200)
          })
          .then((response) => {
            expect(get(response, 'body.attributes.title')).to.be('Updated title');
          })
      });
    }
  });
}
