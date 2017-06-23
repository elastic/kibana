
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
      it('should be able to delete objects', () => {
        supertest
          .delete('/api/saved_objects/index-pattern/.kibana')
          .expect(200);
      });

      it('should 404 if the object does not exist', () => {
        supertest
          .delete('/api/saved_objects/index-pattern/hello')
          .expect(404);
      });
    }
  });
}
