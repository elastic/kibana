import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  const BULK_REQUESTS = [
    {
      type: 'visualization',
      id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
    },
    {
      type: 'dashboard',
      id: 'does not exist',
    },
    {
      type: 'config',
      id: '7.0.0-alpha1',
    },
  ];

  describe('_bulk_get', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 with individual responses', async () => (
        await supertest
          .post(`/api/saved_objects/_bulk_get`)
          .send(BULK_REQUESTS)
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({
              saved_objects: [
                {
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  type: 'visualization',
                  updated_at: '2017-09-21T18:51:23.794Z',
                  version: resp.body.saved_objects[0].version,
                  attributes: {
                    title: 'Count of requests',
                    description: '',
                    version: 1,
                    // cheat for some of the more complex attributes
                    visState: resp.body.saved_objects[0].attributes.visState,
                    uiStateJSON: resp.body.saved_objects[0].attributes.uiStateJSON,
                    kibanaSavedObjectMeta: resp.body.saved_objects[0].attributes.kibanaSavedObjectMeta
                  }
                },
                {
                  id: 'does not exist',
                  type: 'dashboard',
                  error: {
                    statusCode: 404,
                    message: 'Not found'
                  }
                },
                {
                  id: '7.0.0-alpha1',
                  type: 'config',
                  updated_at: '2017-09-21T18:49:16.302Z',
                  version: resp.body.saved_objects[2].version,
                  attributes: {
                    buildNum: 8467,
                    defaultIndex: '91200a00-9efd-11e7-acb3-3dab96693fab'
                  }
                }
              ]
            });
          })
      ));
    });

    describe('without kibana index', () => {
      before(async () => (
        // just in case the kibana server has recreated it
        await es.indices.delete({
          index: '.kibana',
          ignore: [404],
        })
      ));

      it('should return 200 with individual responses', async () => (
        await supertest
          .post('/api/saved_objects/_bulk_get')
          .send(BULK_REQUESTS)
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({
              saved_objects: [
                {
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  type: 'visualization',
                  error: {
                    statusCode: 404,
                    message: 'Not found'
                  }
                },
                {
                  id: 'does not exist',
                  type: 'dashboard',
                  error: {
                    statusCode: 404,
                    message: 'Not found'
                  }
                },
                {
                  id: '7.0.0-alpha1',
                  type: 'config',
                  error: {
                    statusCode: 404,
                    message: 'Not found'
                  }
                }
              ]
            });
          })
      ));
    });
  });
}
