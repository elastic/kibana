import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('get', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200', async () => (
        await supertest
          .get(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({
              id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
              type: 'visualization',
              updated_at: '2017-09-21T18:51:23.794Z',
              version: resp.body.version,
              attributes: {
                title: 'Count of requests',
                description: '',
                version: 1,
                // cheat for some of the more complex attributes
                visState: resp.body.attributes.visState,
                uiStateJSON: resp.body.attributes.uiStateJSON,
                kibanaSavedObjectMeta: resp.body.attributes.kibanaSavedObjectMeta
              }
            });
          })
      ));

      describe('doc does not exist', () => {
        it('should return same generic error as when index does not exist', async () => (
          await supertest
            .get(`/api/saved_objects/visualization/foobar`)
            .expect(404)
            .then(resp => {
              expect(resp.body).to.eql({
                error: 'Not Found',
                message: 'Not Found',
                statusCode: 404,
              });
            })
        ));
      });
    });

    describe('without kibana index', () => {
      before(async () => (
        // just in case the kibana server has recreated it
        await es.indices.delete({
          index: '.kibana',
          ignore: [404],
        })
      ));

      it('should return basic 404 without mentioning index', async () => (
        await supertest
          .get('/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab')
          .expect(404)
          .then(resp => {
            expect(resp.body).to.eql({
              error: 'Not Found',
              message: 'Not Found',
              statusCode: 404,
            });
          })
      ));
    });
  });
}
