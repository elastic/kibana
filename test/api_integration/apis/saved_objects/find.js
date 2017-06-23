import expect from 'expect.js';
import { get } from 'lodash';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const supertest = getService('supertest');

  describe('Find API', () => {

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
      it('should be able to search', async () => {
        const visualization = await supertest
          .post('/api/saved_objects/visualization')
          .send({ attributes: { title: 'Test visualization' } });

        const response = await supertest
          .get('/api/saved_objects')
          .query({
            search: 'test'
          });
        expect(get(response, 'body.saved_objects.0.id')).to.be(get(visualization, 'body.id'));
        expect(get(response, 'body.total')).to.be(1);
      });
    }
  });
}
