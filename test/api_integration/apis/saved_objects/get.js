import expect from 'expect.js';
import { get } from 'lodash';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Get API', function postIngest() {

    describe(('multiple _types'), () => {
      before(() => esArchiver.load('saved_objects/multiple_types'));
      after(() => esArchiver.unload('saved_objects/multiple_types'));

      it('should return a saved object by id', () => (
        supertest
          .get('/api/saved_objects/index-pattern/.kibana')
          .expect(200)
          .then((response) => {
            expect(get(response, 'body.attributes.title')).to.be('.kibana');
          })
      ));
    });

  });
}
