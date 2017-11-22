import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('create', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));
      it('should return 200', async () => {
        await supertest
          .post(`/api/saved_objects/visualization`)
          .send({
            attributes: {
              title: 'My favorite vis'
            }
          })
          .expect(200)
          .then(resp => {
            // loose uuid validation
            expect(resp.body).to.have.property('id').match(/^[0-9a-f-]{36}$/);

            // loose ISO8601 UTC time with milliseconds validation
            expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

            expect(resp.body).to.eql({
              id: resp.body.id,
              type: 'visualization',
              updated_at: resp.body.updated_at,
              version: 1,
              attributes: {
                title: 'My favorite vis'
              }
            });
          });
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

      it('should return 200 and create kibana index', async () => {
        await supertest
          .post(`/api/saved_objects/visualization`)
          .send({
            attributes: {
              title: 'My favorite vis'
            }
          })
          .expect(200)
          .then(resp => {
            // loose uuid validation
            expect(resp.body).to.have.property('id').match(/^[0-9a-f-]{36}$/);

            // loose ISO8601 UTC time with milliseconds validation
            expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

            expect(resp.body).to.eql({
              id: resp.body.id,
              type: 'visualization',
              updated_at: resp.body.updated_at,
              version: 1,
              attributes: {
                title: 'My favorite vis'
              }
            });
          });

        expect(await es.indices.exists({ index: '.kibana' }))
          .to.be(true);
      });
    });
  });
}
