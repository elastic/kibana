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
          .get('/api/saved_objects/_find?type=visualization&fields=title')
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

      describe('unknown type', () => {
        it('should return 200 with empty response', async () => (
          await supertest
            .get('/api/saved_objects/_find?type=wigwags')
            .expect(200)
            .then(resp => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 0,
                saved_objects: []
              });
            })
        ));
      });

      describe('page beyond total', () => {
        it('should return 200 with empty response', async () => (
          await supertest
            .get('/api/saved_objects/_find?type=visualization&page=100&per_page=100')
            .expect(200)
            .then(resp => {
              expect(resp.body).to.eql({
                page: 100,
                per_page: 100,
                total: 1,
                saved_objects: []
              });
            })
        ));
      });

      describe('unknown search field', () => {
        it('should return 200 with empty response', async () => (
          await supertest
            .get('/api/saved_objects/_find?type=wigwags&search_fields=a')
            .expect(200)
            .then(resp => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 0,
                saved_objects: []
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

      it('should return 200 with empty response', async () => (
        await supertest
          .get('/api/saved_objects/_find?type=visualization')
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({
              page: 1,
              per_page: 20,
              total: 0,
              saved_objects: []
            });
          })
      ));

      describe('unknown type', () => {
        it('should return 200 with empty response', async () => (
          await supertest
            .get('/api/saved_objects/_find?type=wigwags')
            .expect(200)
            .then(resp => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 0,
                saved_objects: []
              });
            })
        ));
      });

      describe('page beyond total', () => {
        it('should return 200 with empty response', async () => (
          await supertest
            .get('/api/saved_objects/_find?type=visualization&page=100&per_page=100')
            .expect(200)
            .then(resp => {
              expect(resp.body).to.eql({
                page: 100,
                per_page: 100,
                total: 0,
                saved_objects: []
              });
            })
        ));
      });

      describe('unknown search field', () => {
        it('should return 200 with empty response', async () => (
          await supertest
            .get('/api/saved_objects/_find?type=wigwags&search_fields=a')
            .expect(200)
            .then(resp => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 0,
                saved_objects: []
              });
            })
        ));
      });
    });
  });
}
