import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('delete', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 when deleting a doc', async () => (
        await supertest
          .delete(`/api/saved_objects/dashboard/be3733a0-9efe-11e7-acb3-3dab96693fab`)
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({});
          })
      ));

      it('should return generic 404 when deleting an unknown doc', async () => (
        await supertest
          .delete(`/api/saved_objects/dashboard/not-a-real-id`)
          .expect(404)
          .then(resp => {
            expect(resp.body).to.eql({
              statusCode: 404,
              error: 'Not Found',
              message: 'Not Found'
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

      it('returns generic 404 when kibana index is missing', async () => (
        await supertest
          .delete(`/api/saved_objects/dashboard/be3733a0-9efe-11e7-acb3-3dab96693fab`)
          .expect(404)
          .then(resp => {
            expect(resp.body).to.eql({
              statusCode: 404,
              error: 'Not Found',
              message: 'Not Found'
            });
          })
      ));
    });
  });
}
