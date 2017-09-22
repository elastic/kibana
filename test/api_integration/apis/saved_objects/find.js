import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('find', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 with individual responses', async () => (
        await supertest
          .get('/api/saved_objects/visualization?fields=title')
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({
              page: 1,
              per_page: 20,
              total: 1,
              saved_objects: [
                {
                  type: 'visualization',
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  version: 1,
                  attributes: {
                    'title': 'Count of requests'
                  }
                }
              ]
            });
          })
      ));
    });

    describe('without kibana index', () => {
      it('should return 200 with individual responses', async () => {
        // just in case the kibana server has recreated it
        await es.indices.delete({
          index: '.kibana',
          ignore: [404],
        });

        await supertest
          .get('/api/saved_objects/visualization')
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({
              page: 1,
              per_page: 20,
              total: 0,
              saved_objects: []
            });
          });
      });
    });
  });
}
