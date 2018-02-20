import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  //const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('get', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/tags'));
      after(() => esArchiver.unload('saved_objects/tags'));

      it('should return tags', async () => (
        await supertest
          .get(`/api/tags`)
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql([
              { label: 'someOtherTag', color: 'red' },
              { label: 'dash1Tag', color: 'lightGrey1' },
              { label: 'vis1Tag', color: 'lightGrey1' }
            ]);
          })
      ));
    });
  });
}
